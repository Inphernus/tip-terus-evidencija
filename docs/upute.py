"""
Generira PDF upute: docs/Upute-djelatnici.pdf i docs/Upute-admin-Jura.pdf
Pokretanje: python3 docs/upute.py   (treba reportlab; fontovi: Arial s macOS-a)
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

OUT = Path(__file__).parent
URL = "satnica.tip-terus.hr"

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("Arial", FONT_DIR / "Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FONT_DIR / "Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FONT_DIR / "Arial Italic.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

ACCENT = colors.HexColor("#1d4ed8")
INK = colors.HexColor("#171717")
MUTED = colors.HexColor("#5f5f5a")
LINE = colors.HexColor("#e2e2de")
SOFT = colors.HexColor("#f4f6fb")
WARN_BG = colors.HexColor("#fff4d6")
WARN_LINE = colors.HexColor("#e8b931")
TIP_BG = colors.HexColor("#e9f6ee")
TIP_LINE = colors.HexColor("#3c9a5f")

S = {
    "h1": ParagraphStyle("h1", fontName="Arial-Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=4),
    "sub": ParagraphStyle("sub", fontName="Arial", fontSize=11, leading=15, textColor=MUTED, spaceAfter=14),
    "h2": ParagraphStyle("h2", fontName="Arial-Bold", fontSize=14.5, leading=19, textColor=ACCENT, spaceBefore=14, spaceAfter=6),
    "h3": ParagraphStyle("h3", fontName="Arial-Bold", fontSize=11.5, leading=15, textColor=INK, spaceBefore=8, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="Arial", fontSize=10.5, leading=15, textColor=INK, spaceAfter=5, alignment=TA_LEFT),
    "li": ParagraphStyle("li", fontName="Arial", fontSize=10.5, leading=15, textColor=INK, leftIndent=12, bulletIndent=2, spaceAfter=2),
    "step": ParagraphStyle("step", fontName="Arial", fontSize=10.5, leading=15, textColor=INK),
    "num": ParagraphStyle("num", fontName="Arial-Bold", fontSize=11, leading=15, textColor=colors.white, alignment=1),
    "box": ParagraphStyle("box", fontName="Arial", fontSize=10, leading=14, textColor=INK),
    "cell": ParagraphStyle("cell", fontName="Arial", fontSize=9.5, leading=13, textColor=INK),
    "cellb": ParagraphStyle("cellb", fontName="Arial-Bold", fontSize=9.5, leading=13, textColor=INK),
}


def btn(text, dark=False):
    """Izgled gumba iz aplikacije u tekstu."""
    bg = "#171717" if dark else "#1d4ed8"
    return f'<font backColor="{bg}" color="white"><b>&nbsp;{text}&nbsp;</b></font>'


def ui(text):
    """Naziv iz sučelja (link, izbornik, polje)."""
    return f'<font color="#1d4ed8"><b>{text}</b></font>'


def p(text):
    return Paragraph(text, S["p"])


def bullets(items):
    return [Paragraph(t, S["li"], bulletText="•") for t in items]


def steps(items):
    rows = [[Paragraph(str(i), S["num"]), Paragraph(t, S["step"])] for i, t in enumerate(items, 1)]
    t = Table(rows, colWidths=[8 * mm, None])
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i in range(len(rows)):
        style.append(("BACKGROUND", (0, i), (0, i), ACCENT))
    style.append(("LINEBELOW", (0, 0), (0, -2), 2, colors.white))
    t.setStyle(TableStyle(style))
    return KeepTogether([t, Spacer(1, 6)])


def callout(title, text, kind="tip"):
    bg, line = (TIP_BG, TIP_LINE) if kind == "tip" else (WARN_BG, WARN_LINE)
    t = Table([[Paragraph(f"<b>{title}</b><br/>{text}", S["box"])]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, line),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return KeepTogether([Spacer(1, 4), t, Spacer(1, 6)])


def table(header, rows, widths):
    data = [[Paragraph(h, S["cellb"]) for h in header]] + [[Paragraph(c, S["cell"]) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether([t, Spacer(1, 6)])


def build(filename, title, subtitle, story):
    def decorate(canvas, doc):
        w, h = A4
        canvas.saveState()
        canvas.setFillColor(ACCENT)
        canvas.rect(0, h - 8 * mm, w, 8 * mm, stroke=0, fill=1)
        canvas.setFont("Arial", 8.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 10 * mm, f"Tip-Terus · Evidencija rada · {URL}")
        canvas.drawRightString(w - 18 * mm, 10 * mm, f"Stranica {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(OUT / filename), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm, bottomMargin=20 * mm,
        title=title, author="Tip-Terus",
    )
    flat = []
    for item in story:
        flat.extend(item if isinstance(item, list) else [item])
    # Naslov uvijek ostaje na istoj stranici kao ono što slijedi iza njega.
    glued = []
    for item in flat:
        if glued and isinstance(glued[-1], Paragraph) and glued[-1].style.name in ("h2", "h3"):
            inner = item._content if isinstance(item, KeepTogether) else [item]
            glued[-1] = KeepTogether([glued[-1], *inner])
        else:
            glued.append(item)
    flat = glued
    doc.build([Paragraph(title, S["h1"]), Paragraph(subtitle, S["sub"])] + flat,
              onFirstPage=decorate, onLaterPages=decorate)


# ---------------------------------------------------------------------------
# Upute za djelatnike
# ---------------------------------------------------------------------------
def djelatnici():
    st = []
    st += [
        p(f"Aplikacija služi za bilježenje dolaska na posao i odlaska s posla. Sate za svaki dan računa sama. "
          f"Otvara se u pregledniku na mobitelu ili računalu, na adresi <b>https://{URL}</b>."),
        Paragraph("1. Prva prijava", S["h2"]),
        steps([
            f"Otvori <b>https://{URL}</b>.",
            "Upiši svoj <b>mail</b> i <b>privremenu lozinku</b> koju si dobio od Jure, pa klikni " + btn("Prijavi se") + ".",
            f"U gornjem izborniku klikni {ui('Lozinka')} i postavi svoju lozinku: upiši trenutnu (privremenu) lozinku, "
            "pa dvaput novu (barem 8 znakova), i klikni " + btn("Promijeni lozinku") + ".",
        ]),
        callout("Savjet: dodaj aplikaciju na početni zaslon mobitela",
                "<b>iPhone (Safari):</b> ikona Dijeli (kvadrat sa strelicom) → <i>Dodaj na početni zaslon</i>.<br/>"
                "<b>Android (Chrome):</b> izbornik (tri točkice gore desno) → <i>Dodaj na početni zaslon</i>.<br/>"
                "Nakon toga aplikaciju otvaraš kao svaku drugu, jednim dodirom."),
        Paragraph("2. Svaki radni dan", S["h2"]),
        steps([
            "Kad dođeš na posao, otvori aplikaciju i klikni " + btn("Došao sam") + ". Brojač sati se pokreće.",
            "Kad odlaziš s posla, klikni " + btn("Odlazim", dark=True) + ". Dan je zatvoren i sati su zapisani.",
        ]),
        p("Vrijeme se zapisuje <b>u trenutku klika</b>, prema satu na serveru. Ne ovisi o satu na mobitelu."),
        callout("Pauza",
                "Pauza se računa u radno vrijeme, pa se za pauzu <b>ne trebaš odjavljivati</b>. "
                "Ako tijekom dana odeš pa se vratiš (npr. teren ili privatna obveza), klikni " + btn("Odlazim", dark=True)
                + " kad odeš i " + btn("Došao sam") + " kad se vratiš. U danu može biti više dolazaka, a sati se zbrajaju."),
        callout("Važno: nema naknadnog upisa",
                "Dolazak i odlazak možeš zabilježiti samo klikom u stvarnom trenutku. Vrijeme ne možeš upisati unatrag, "
                "promijeniti ni obrisati. Ako si zaboravio kliknuti ili si kliknuo krivo, <b>javi se Juri</b>, "
                "on će ispraviti zapis.", kind="warn"),
        Paragraph("3. Što vidiš u aplikaciji", S["h2"]),
        table(["Dio ekrana", "Što prikazuje"], [
            ["Brojač na vrhu", "Koliko si danas odradio. Dok si na poslu, broji dalje."],
            ["Današnji zapisi", "Svi današnji dolasci i odlasci, s napomenom ako ih je Jura ispravio."],
            ["Mjesečni pregled", f"Svaki dan u mjesecu: dolasci i odlasci, sati, oznake <b>Godišnji</b>, <b>Bolovanje</b> "
                                  f"ili <b>Blagdan</b> (8 h) i Jurine napomene. Gumbom {ui('← Prethodni')} gledaš ranije mjesece."],
            ["Tjedni retci", "Zbroj sati za svaki tjedan (ponedjeljak – nedjelja)."],
            ["Crveno upozorenje", "Dan na koji nisi zabilježio odlazak. Takav dan može zatvoriti samo Jura."],
        ], [42 * mm, None]),
        Paragraph("4. Česta pitanja", S["h2"]),
        Paragraph("Zaboravio sam kliknuti „Došao sam“ ili „Odlazim“.", S["h3"]),
        p("Javi se Juri i reci mu točno vrijeme. On će upisati ili ispraviti zapis, uz kratku napomenu koju ćeš i ti vidjeti."),
        Paragraph("Zaboravio sam lozinku.", S["h3"]),
        p("Javi se Juri. On ti postavlja novu privremenu lozinku, a ti je nakon prijave promijeniš preko izbornika "
          f"{ui('Lozinka')}."),
        Paragraph("Na godišnjem sam ili na bolovanju. Trebam li nešto klikati?", S["h3"]),
        p("Ne. Godišnji, bolovanje i blagdane upisuje Jura, a svaki takav dan vrijedi 8 sati."),
        Paragraph("Radim subotom.", S["h3"]),
        p("Subota je radni dan. Klikni " + btn("Došao sam") + " i " + btn("Odlazim", dark=True) + " kao i svaki drugi dan."),
        Paragraph("Koristim tuđi ili zajednički uređaj.", S["h3"]),
        p(f"Kad završiš, u gornjem izborniku klikni {ui('Odjava')}."),
    ]
    build("Upute-djelatnici.pdf", "Evidencija rada: upute za djelatnike",
          f"Kako bilježiti dolazak i odlazak · https://{URL}", st)


# ---------------------------------------------------------------------------
# Upute za admina (Jura)
# ---------------------------------------------------------------------------
def admin():
    st = []
    st += [
        p(f"Admin sučelje služi za pregled i ispravke sati svih djelatnika, godišnje, bolovanja i blagdane, "
          f"statistiku i izvoz šihterice. Adresa je ista kao za djelatnike: <b>https://{URL}</b>. "
          f"Nakon prijave admin računom aplikacija te sama vodi na admin sučelje."),
        table(["Pravilo", "Kako aplikacija radi"], [
            ["Upis djelatnika", "Djelatnik samo klikne <b>Došao sam</b> ili <b>Odlazim</b> u stvarnom trenutku. "
                                "Upis unatrag, ispravke i brisanje radiš samo ti."],
            ["Pauza", "Ulazi u radno vrijeme i ne odbija se. U danu može biti više dolazaka, a sati se zbrajaju."],
            ["Godišnji, bolovanje, blagdan", "Svaka oznaka vrijedi <b>8 h</b> i vodi se zasebno. Dan može imati <b>samo jednu</b> oznaku."],
            ["Limit po danu", "Najviše <b>8 h</b> (rad + oznaka). Dan s više sati označen je oznakom <i>više od 8 h</i>, da ga provjeriš."],
            ["Limit po tjednu", "Najviše <b>40 h</b> od ponedjeljka do nedjelje (rad + oznake). Tjedan s više sati označen je žuto."],
            ["Radni dani", "Ponedjeljak – subota. Nedjelje i blagdani su u tablicama i šihterici osjenčani sivo."],
        ], [42 * mm, None]),

        Paragraph("1. Početna: Djelatnici", S["h2"]),
        p("Na vrhu je izbornik: " + ui("Djelatnici") + " · " + ui("Statistika") + " · " + ui("Lozinka") + " · " + ui("Odjava") + "."),
        bullets([
            "<b>Tablica djelatnika:</b> stanje danas (<i>u radu od…</i>, <i>otišao</i>, <i>nije došao</i>, godišnji…), "
            "sati danas i ukupno u tekućem mjesecu. Klikom na ime otvaraš djelatnika.",
            "<b>Nezatvoreni dani</b> (crveni okvir): djelatnik je zabilježio dolazak, ali ne i odlazak. "
            "Klikom na redak otvaraš taj dan i upisuješ odlazak (vidi točku 4).",
            "<b>Za provjeru</b> (žuti okvir): dani s više od 8 h i tjedni s više od 40 h u zadnja 4 tjedna. "
            "Klik vodi na taj dan ili tjedan.",
            "<b>Blagdan za sve djelatnike</b>: vidi točku 5.",
            f"{ui('Prikaži i neaktivne djelatnike')}: prikazuje i uklonjene djelatnike.",
        ]),

        Paragraph("2. Novi djelatnik", S["h2"]),
        steps([
            "Na početnoj klikni " + btn("+ Novi djelatnik") + ".",
            "Upiši <b>ime</b>, <b>prezime</b>, <b>mail</b> i <b>privremenu lozinku</b> (barem 8 znakova), pa klikni "
            + btn("Dodaj djelatnika") + ".",
            f"Djelatniku pošalji adresu <b>https://{URL}</b>, njegov mail i privremenu lozinku, te uz to "
            "<i>Upute za djelatnike</i>. Lozinku će promijeniti sam nakon prve prijave.",
        ]),

        Paragraph("3. Stranica djelatnika", S["h2"]),
        p("Klikom na ime djelatnika otvara se njegov mjesečni pregled, a desno su opcije."),
        bullets([
            f"<b>Tablica po danima:</b> dolasci i odlasci, sati, oznake i napomene. Iznad svakog tjedna je redak sa zbrojem; "
            f"žuti redak znači više od 40 h. Gumbima {ui('← Prethodni')} i {ui('Sljedeći →')} mijenjaš mjesec. "
            f"<b>Klik na datum</b> otvara uređivanje tog dana.",
            "<b>Godišnji / bolovanje / blagdan:</b> odaberi vrstu, datume <i>Od</i> i <i>Do</i> (za jedan dan isti datum), "
            "po želji napomenu, pa klikni " + btn("Spremi") + ". Nedjelje se preskaču, a subote ovise o kvačici "
            "<i>Uključi subote</i>. Kod godišnjeg i bolovanja preskaču se i blagdani. Opcijom <i>Ukloni oznaku</i> "
            "brišeš oznake u odabranom razdoblju.",
            "<b>Nova lozinka:</b> kad djelatnik zaboravi lozinku, upiši novu privremenu i javi mu je.",
            f"<b>{ui('Ukloni djelatnika')}</b>: djelatnik se više ne može prijaviti, ali njegovi sati ostaju u evidenciji i šihterici. "
            "Može se vratiti gumbom <i>Vrati djelatnika</i>.",
        ]),
        callout("Jedna oznaka po danu",
                "Ako u odabranom razdoblju neki dan već ima drugu oznaku (npr. upisuješ bolovanje preko godišnjeg), "
                "<b>ništa se ne sprema</b>, a aplikacija ispiše o kojim je danima riječ. Te dane prvo ukloni ili promijeni.",
                kind="warn"),

        Paragraph("4. Uređivanje dana (ispravke sati)", S["h2"]),
        p("Na stranici djelatnika klikni datum (ili redak u crvenom ili žutom okviru na početnoj)."),
        steps([
            "<b>Dodavanje:</b> klikni " + btn("+ Dodaj") + ", upiši dolazak, odlazak i <b>opis izmjene</b>, pa klikni " + btn("Spremi") + ".",
            f"<b>Ispravak:</b> kod zapisa klikni {ui('Uredi')}, promijeni vremena, upiši opis i spremi. "
            "Ovako zatvaraš i nezatvoreni dan: upišeš vrijeme odlaska.",
            f"<b>Brisanje:</b> klikni {ui('Obriši')}, upiši razlog i potvrdi.",
            "<b>Oznaka dana:</b> u donjem okviru odaberi <i>Ništa</i>, <i>Godišnji</i>, <i>Bolovanje</i> ili <i>Blagdan</i> i spremi.",
        ]),
        callout("Opis izmjene je obavezan",
                "Opis vidi i djelatnik, a ispisuje se i u šihterici, pa neka bude kratak i jasan "
                "(npr. <i>zaboravio odjavu, dogovoreno 15:30</i>). Svaka izmjena se bilježi u povijest."),
        p("Za prošli dan moraš upisati i dolazak i odlazak. Vrijeme ne može biti u budućnosti i ne smije se preklapati s drugim zapisom tog dana."),

        Paragraph("5. Blagdan za sve djelatnike", S["h2"]),
        steps([
            "Na početnoj, u okviru <b>Blagdan za sve djelatnike</b>, odaberi blagdan s popisa.",
            "Po želji upiši napomenu i klikni " + btn("Zavedi blagdan svima") + ". Svaki aktivni djelatnik dobije 8 h blagdana.",
            "Tko taj dan već ima godišnji ili bolovanje, ostaje kako je. Gumbom <i>Ukloni svima</i> poništavaš blagdan za taj dan.",
        ]),
        p("Pojedinom djelatniku blagdan zavodiš na njegovoj stranici ili na stranici dana."),

        Paragraph("6. Statistika", S["h2"]),
        steps([
            f"U izborniku klikni {ui('Statistika')}.",
            "Odaberi djelatnika (ili <i>Svi djelatnici</i>) i razdoblje <i>Od</i> – <i>Do</i>, pa klikni " + btn("Prikaži") + ".",
            "Tablica prikazuje sate rada, dane godišnjeg, bolovanja i blagdana, ukupne sate te broj dana preko 8 h i tjedana preko 40 h. "
            "Klikom na ime vidiš i pregled po danima.",
        ]),

        Paragraph("7. Export šihterice (Excel)", S["h2"]),
        p("Na stranici Statistika, nakon odabira, klikni " + btn("Export šihterice (Excel)") + "."),
        bullets([
            "<b>Jedan djelatnik:</b> list s danima (datum, dan, dolasci i odlasci, rad, godišnji, bolovanje, blagdan, ukupno, napomena), "
            "zbrojem na dnu i mjestom za potpise.",
            "<b>Svi djelatnici:</b> prvi list <i>Zbirno</i> s pregledom svih, a zatim po jedan list za svakog djelatnika.",
            "Nedjelje i blagdani su osjenčani sivo. U napomeni su oznake, tvoji opisi izmjena, <i>NIJE ZATVOREN</i> "
            "te upozorenja za dan preko 8 h i tjedan preko 40 h.",
        ]),

        Paragraph("8. Korisno znati", S["h2"]),
        bullets([
            f"Vlastitu lozinku mijenjaš preko {ui('Lozinka')} u izborniku.",
            "Popis blagdana u aplikaciji pokriva 2026. i 2027. godinu. Prije 2028. treba dodati nove datume (javi Dariju).",
            "Za tehničke probleme (prijava ne radi, stranica se ne otvara) javi se Dariju.",
        ]),
    ]
    build("Upute-admin-Jura.pdf", "Evidencija rada: upute za admina",
          f"Za Juru · pregled, ispravke, godišnji i bolovanja, statistika, šihterica · https://{URL}", st)


if __name__ == "__main__":
    djelatnici()
    admin()
    print("OK:", OUT / "Upute-djelatnici.pdf", OUT / "Upute-admin-Jura.pdf")
