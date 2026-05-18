"""
Generare PDF - Plan Turneu de Fotbal
CSC Mosnita 2026 | 20 Echipe | 4 Terenuri | 1 Zi
FARA diacritice pentru compatibilitate PDF
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus.flowables import Flowable
import os, math
from datetime import datetime, timedelta

# ── Culori ──────────────────────────────────────────────────────────────────
GREEN_DARK  = colors.HexColor('#1B5E20')
GREEN_MID   = colors.HexColor('#388E3C')
GREEN_LIGHT = colors.HexColor('#81C784')
GREEN_PALE  = colors.HexColor('#E8F5E9')
GOLD        = colors.HexColor('#FFD700')
GOLD_DARK   = colors.HexColor('#B8860B')
GOLD_PALE   = colors.HexColor('#FFF9C4')
WHITE       = colors.white
GRAY_LIGHT  = colors.HexColor('#F5F5F5')
GRAY_MED    = colors.HexColor('#BDBDBD')
GRAY_DARK   = colors.HexColor('#616161')
BLACK       = colors.black
BLUE        = colors.HexColor('#1565C0')
RED         = colors.HexColor('#C62828')
ORANGE      = colors.HexColor('#E65100')
PURPLE      = colors.HexColor('#6A1B9A')

PAGE_W, PAGE_H = A4

# ── Flowable: Linie decorativa ───────────────────────────────────────────────
class DecorativeLine(Flowable):
    def __init__(self, width, c1=GREEN_DARK, c2=GOLD, h=6):
        super().__init__()
        self.lw = width; self.c1 = c1; self.c2 = c2; self.lh = h
    def draw(self):
        self.canv.setFillColor(self.c1)
        self.canv.rect(0, 0, self.lw * 0.7, self.lh, fill=1, stroke=0)
        self.canv.setFillColor(self.c2)
        self.canv.rect(self.lw * 0.7, 0, self.lw * 0.3, self.lh, fill=1, stroke=0)
    def wrap(self, aW, aH): return self.lw, self.lh + 2


# ── Flowable: Sectiune header ────────────────────────────────────────────────
class SectionHeader(Flowable):
    def __init__(self, text, width, bg=GREEN_DARK, fg=WHITE, height=24):
        super().__init__()
        self.text = text; self.sw = width; self.bg = bg; self.fg = fg; self.sh = height
    def draw(self):
        c = self.canv
        c.setFillColor(self.bg)
        c.roundRect(0, 0, self.sw, self.sh, 4, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.rect(0, 0, 6, self.sh, fill=1, stroke=0)
        c.setFillColor(self.fg)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(14, self.sh / 2 - 4, self.text)
    def wrap(self, aW, aH): return self.sw, self.sh + 4


# ── Flowable: Teren fotbal cu 4 subterenuri ──────────────────────────────────
class FootballField(Flowable):
    def __init__(self, w=14*cm, h=7*cm):
        super().__init__()
        self.fw = w; self.fh = h
    def draw(self):
        c = self.canv; fw = self.fw; fh = self.fh
        # dungi gazon
        sw = fw / 10
        for i in range(10):
            c.setFillColor(colors.HexColor('#2E7D32') if i%2==0 else colors.HexColor('#388E3C'))
            c.rect(i*sw, 0, sw, fh, fill=1, stroke=0)
        # bordura
        c.setStrokeColor(WHITE); c.setLineWidth(2.5)
        c.roundRect(0, 0, fw, fh, 8, fill=0, stroke=1)
        # linii despartire
        c.setLineWidth(2)
        c.line(fw/2, 0, fw/2, fh)
        c.line(0, fh/2, fw, fh/2)
        # etichete
        labels = [
            ("Terenul 1 / Grupa A", fw*0.25, fh*0.75),
            ("Terenul 2 / Grupa B", fw*0.75, fh*0.75),
            ("Terenul 3 / Grupa C", fw*0.25, fh*0.25),
            ("Terenul 4 / Grupa D", fw*0.75, fh*0.25),
        ]
        c.setFillColor(WHITE); c.setFont("Helvetica-Bold", 8)
        for txt, x, y in labels:
            c.drawCentredString(x, y, txt)
        # cercuri centru
        c.setStrokeColor(WHITE); c.setLineWidth(1.5)
        for cx, cy in [(fw*0.25, fh*0.75),(fw*0.75, fh*0.75),(fw*0.25, fh*0.25),(fw*0.75, fh*0.25)]:
            c.circle(cx, cy, 12, fill=0, stroke=1)
        # porti
        c.setFillColor(WHITE)
        gw, gh = 4, 10
        for cx, cy in [(fw*0.25, fh*0.75),(fw*0.75, fh*0.75),(fw*0.25, fh*0.25),(fw*0.75, fh*0.25)]:
            # portile stangi si drepte (simulate)
            pass
    def wrap(self, aW, aH): return self.fw, self.fh


# ── Flowable: Bracket eliminatoriu ──────────────────────────────────────────
class KnockoutBracket(Flowable):
    def __init__(self, w=16*cm, h=10*cm):
        super().__init__()
        self.bw = w; self.bh = h
    def draw(self):
        c = self.canv; bw = self.bw; bh = self.bh
        bx = 3.0*cm; bh_box = 0.85*cm; gap = 1.8*cm
        sf_x = bx + bx + gap; fin_x = sf_x + bx + gap

        def box(x, y, txt, bg=GREEN_PALE):
            c.setFillColor(bg); c.setStrokeColor(GREEN_DARK); c.setLineWidth(0.8)
            c.roundRect(x, y, bx, bh_box, 3, fill=1, stroke=1)
            c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 6.5)
            c.drawCentredString(x + bx/2, y + bh_box/2 - 3, txt)

        def conn(x1, y1, x2, y2):
            mx = (x1+x2)/2
            c.setStrokeColor(GRAY_MED); c.setLineWidth(1)
            c.line(x1, y1, mx, y1); c.line(mx, y1, mx, y2); c.line(mx, y2, x2, y2)

        # col headers
        c.setFont("Helvetica-Bold", 8); c.setFillColor(GREEN_DARK)
        c.drawCentredString(0.2*cm + bx/2, bh - 0.8*cm, "SFERTURI")
        c.drawCentredString(sf_x + bx/2,   bh - 0.8*cm, "SEMIFINALE")
        c.drawCentredString(fin_x + bx/2,  bh - 0.8*cm, "FINALA")

        qf_y = [8.5*cm, 6.5*cm, 4.5*cm, 2.5*cm]
        qf_teams = ["1A vs 2D","1B vs 2C","1C vs 2B","1D vs 2A"]
        for i, (y, t) in enumerate(zip(qf_y, qf_teams)):
            box(0.2*cm, y, t)

        sf_y = [7.5*cm, 3.5*cm]
        for y in sf_y:
            box(sf_x, y, "Castigator QF", GREEN_PALE)

        conn(0.2*cm+bx, qf_y[0]+bh_box/2, sf_x, sf_y[0]+bh_box/2)
        conn(0.2*cm+bx, qf_y[1]+bh_box/2, sf_x, sf_y[0]+bh_box/2)
        conn(0.2*cm+bx, qf_y[2]+bh_box/2, sf_x, sf_y[1]+bh_box/2)
        conn(0.2*cm+bx, qf_y[3]+bh_box/2, sf_x, sf_y[1]+bh_box/2)

        fin_y = [5.8*cm, 4.6*cm]
        box(fin_x, fin_y[0], "FINALIST 1", GOLD_PALE)
        box(fin_x, fin_y[1], "FINALIST 2", GOLD_PALE)

        conn(sf_x+bx, sf_y[0]+bh_box/2, fin_x, fin_y[0]+bh_box/2)
        conn(sf_x+bx, sf_y[1]+bh_box/2, fin_x, fin_y[1]+bh_box/2)

        # trofeu
        c.setFont("Helvetica-Bold", 8); c.setFillColor(GOLD_DARK)
        c.drawCentredString(fin_x + bx + 0.8*cm, fin_y[0] + bh_box/2 - 3, "CASTIGATOR")

        # locul 3
        box(fin_x, 2.8*cm, "Locul 3 - SF1", colors.HexColor('#FFE0B2'))
        box(fin_x, 1.6*cm, "Locul 3 - SF2", colors.HexColor('#FFE0B2'))
        c.setFont("Helvetica", 6.5); c.setFillColor(ORANGE)
        c.drawCentredString(fin_x + bx/2, 0.9*cm, "Finala mica")

    def wrap(self, aW, aH): return self.bw, self.bh


# ── Flowable: Grafic bare venituri optionale ─────────────────────────────────
class OptRevChart(Flowable):
    def __init__(self, w=14*cm, h=6*cm):
        super().__init__()
        self.bw = w; self.bh = h
    def draw(self):
        c = self.canv; bw = self.bw; bh = self.bh
        cats = [
            ("Sponsorizari", 3000, BLUE),
            ("Bilete\nspect.", 2000, PURPLE),
            ("Vanzari\nalim.", 1800, ORANGE),
            ("Tombola", 1500, GREEN_MID),
            ("Foto/Video", 800, colors.HexColor('#00838F')),
            ("Parcare", 500, GRAY_DARK),
        ]
        max_v = 3000
        ml = 45; mb = 30; cw = bw - ml - 10; ch = bh - mb - 15
        # axe
        c.setStrokeColor(GRAY_DARK); c.setLineWidth(1)
        c.line(ml, mb, ml, bh-10); c.line(ml, mb, bw-10, mb)
        # ghidaj
        for i in range(1, 5):
            y = mb + ch*i/4
            c.setStrokeColor(GRAY_MED); c.setDash(2,3)
            c.line(ml+2, y, bw-10, y); c.setDash()
            c.setFillColor(GRAY_DARK); c.setFont("Helvetica", 6)
            c.drawRightString(ml-3, y-3, f"{int(max_v*i/4):,}")
        bar_area = cw / len(cats)
        for i, (lbl, val, col) in enumerate(cats):
            x = ml + i*bar_area + bar_area*0.15
            bw2 = bar_area*0.7; bh2 = (val/max_v)*ch
            c.setFillColor(colors.Color(0,0,0,alpha=0.1))
            c.rect(x+2, mb-2, bw2, bh2, fill=1, stroke=0)
            c.setFillColor(col)
            c.roundRect(x, mb, bw2, bh2, 3, fill=1, stroke=0)
            c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 6)
            c.drawCentredString(x+bw2/2, mb+bh2+2, f"{val:,}")
            for j, ln in enumerate(lbl.split('\n')):
                c.setFont("Helvetica", 6)
                c.drawCentredString(x+bw2/2, mb-10-j*7, ln)
    def wrap(self, aW, aH): return self.bw, self.bh


# ── Helper: tabel stilizat ───────────────────────────────────────────────────
def styled_table(data, cw, hbg=GREEN_DARK, altbg=GREEN_PALE, hfg=WHITE):
    t = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,0), hbg),
        ('TEXTCOLOR',   (0,0), (-1,0), hfg),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0), (-1,0), 9),
        ('ALIGN',       (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUND',(0,1),(-1,-1), [GRAY_LIGHT, altbg]),
        ('FONTNAME',    (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',    (0,1), (-1,-1), 8),
        ('GRID',        (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',   (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',  (0,0), (-1,-1), 3),
        ('BOTTOMPADDING',(0,0),(-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING',(0,0), (-1,-1), 4),
    ]))
    return t


# ── Date echipe & grupe ──────────────────────────────────────────────────────
GRUPE = {
    'A': ['Echipa 1','Echipa 2','Echipa 3','Echipa 4','Echipa 5'],
    'B': ['Echipa 6','Echipa 7','Echipa 8','Echipa 9','Echipa 10'],
    'C': ['Echipa 11','Echipa 12','Echipa 13','Echipa 14','Echipa 15'],
    'D': ['Echipa 16','Echipa 17','Echipa 18','Echipa 19','Echipa 20'],
}

ALL_PAIRS = [(0,1),(0,2),(0,3),(0,4),(1,2),(1,3),(1,4),(2,3),(2,4),(3,4)]

MATCH_SLOTS = [
    # (slot, pA, pB, pC, pD)
    (1,  (0,1),(0,1),(0,1),(0,1)),
    (2,  (2,3),(2,3),(2,3),(2,3)),
    (3,  (0,2),(0,2),(0,2),(0,2)),
    (4,  (1,4),(1,4),(1,4),(1,4)),
    (5,  (0,3),(0,3),(0,3),(0,3)),
    (6,  (1,2),(1,2),(1,2),(1,2)),
    (7,  (0,4),(0,4),(0,4),(0,4)),
    (8,  (2,4),(2,4),(2,4),(2,4)),
    (9,  (1,3),(1,3),(1,3),(1,3)),
    (10, (3,4),(3,4),(3,4),(3,4)),
]

START = datetime(2026, 1, 1, 9, 0)
SLOT_DUR = timedelta(minutes=30)


def fmt_match(pair, grp):
    t = GRUPE[grp]
    return f"{t[pair[0]]} vs {t[pair[1]]}"


# ── Cover page ───────────────────────────────────────────────────────────────
def draw_cover(c, doc):
    w, h = PAGE_W, PAGE_H
    # dungi gazon
    sw = w / 12
    for i in range(12):
        c.setFillColor(colors.HexColor('#1B5E20') if i%2==0 else colors.HexColor('#2E7D32'))
        c.rect(i*sw, 0, sw, h, fill=1, stroke=0)
    # benzi aurii
    for y, hh in [(0, 1.5*cm),(h-1.5*cm, 1.5*cm)]:
        c.setFillColor(GOLD); c.rect(0, y, w, hh, fill=1, stroke=0)
        c.setFillColor(GOLD_DARK)
        c.rect(0, y+(hh if y==0 else -0.2*cm), w, 0.2*cm, fill=1, stroke=0)
    # minge
    bx, by, br = w/2, h/2+2.5*cm, 2.2*cm
    c.setFillColor(WHITE); c.setStrokeColor(BLACK); c.setLineWidth(2)
    c.circle(bx, by, br, fill=1, stroke=1)
    def penta(cx, cy, r, off=math.pi/2):
        pts = [(cx+r*math.cos(2*math.pi/5*i+off), cy+r*math.sin(2*math.pi/5*i+off)) for i in range(5)]
        p = c.beginPath(); p.moveTo(*pts[0])
        for pt in pts[1:]: p.lineTo(*pt)
        p.close(); c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(BLACK)
    penta(bx, by, br*0.4)
    for i in range(5):
        ang = 2*math.pi/5*i + math.pi/2
        penta(bx+br*0.73*math.cos(ang), by+br*0.73*math.sin(ang), br*0.22, ang+math.pi/5)
    # titlu
    c.setFillColor(WHITE); c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(w/2, by-br-1.2*cm, "PLAN TURNEU DE FOTBAL")
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(w/2, by-br-2.1*cm, "CSC Mosnita  |  Editia 2026")
    c.setFillColor(WHITE); c.setFont("Helvetica", 13)
    iy = by-br-3.0*cm
    c.drawCentredString(w/2, iy, "20 Echipe  |  4 Terenuri  |  1 Zi  |  500 RON / Echipa")
    c.setStrokeColor(GOLD); c.setLineWidth(2)
    c.line(w*0.2, iy-0.5*cm, w*0.8, iy-0.5*cm)
    c.setFillColor(GOLD_PALE); c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(w/2, iy-1.2*cm, "Data: ________________  |  Locul: Mosnita Noua, Timis")
    # casute statistici
    boxes = [("20","Echipe"),("40+","Meciuri"),("4","Terenuri"),("~9h","Durata"),("500","RON/echipa")]
    baw = w/len(boxes)
    bay = 2.5*cm
    for i,(v,l) in enumerate(boxes):
        bx2 = i*baw+baw*0.1; bw2 = baw*0.8
        c.setFillColor(colors.Color(0,0,0,alpha=0.3))
        c.roundRect(bx2+2, bay-2, bw2, 1.6*cm, 6, fill=1, stroke=0)
        c.setFillColor(colors.Color(1,1,1,alpha=0.15))
        c.roundRect(bx2, bay, bw2, 1.6*cm, 6, fill=1, stroke=0)
        c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(bx2+bw2/2, bay+0.7*cm, v)
        c.setFillColor(WHITE); c.setFont("Helvetica", 8)
        c.drawCentredString(bx2+bw2/2, bay+0.15*cm, l)


def draw_page_decor(c, doc):
    w, h = PAGE_W, PAGE_H
    c.setFillColor(GREEN_DARK); c.rect(0, h-1.2*cm, w, 1.2*cm, fill=1, stroke=0)
    c.setFillColor(GOLD);       c.rect(0, h-1.35*cm, w, 0.15*cm, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont("Helvetica-Bold", 10)
    c.drawString(1.5*cm, h-0.85*cm, "PLAN TURNEU DE FOTBAL  -  CSC Mosnita 2026")
    c.setFont("Helvetica", 8)
    c.drawRightString(w-1.5*cm, h-0.85*cm, f"Pagina {doc.page}")
    c.setFillColor(GREEN_DARK); c.rect(0, 0, w, 0.9*cm, fill=1, stroke=0)
    c.setFillColor(GOLD);       c.rect(0, 0.9*cm, w, 0.12*cm, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont("Helvetica", 7)
    c.drawCentredString(w/2, 0.3*cm, "CSC Mosnita  -  Turneu de Fotbal 2026  -  Document confidential")


# ── Stiluri ──────────────────────────────────────────────────────────────────
def styles():
    s = getSampleStyleSheet()
    body  = ParagraphStyle('B', parent=s['Normal'], fontSize=9.5, leading=14, fontName='Helvetica', spaceAfter=4)
    note  = ParagraphStyle('N', parent=s['Normal'], fontSize=8.5, leading=12, fontName='Helvetica-Oblique',
                           textColor=BLUE, leftIndent=8, spaceAfter=4)
    small = ParagraphStyle('S', parent=s['Normal'], fontSize=8,   fontName='Helvetica', textColor=GRAY_DARK, spaceAfter=2)
    ctr   = ParagraphStyle('C', parent=s['Normal'], fontSize=9,   fontName='Helvetica', alignment=TA_CENTER, spaceAfter=2)
    return body, note, small, ctr


# ── Continut PDF ─────────────────────────────────────────────────────────────
def build_story(pw):
    body, note, small, ctr = styles()
    story = []
    story.append(PageBreak())   # pagina 1 = cover (desenata in onFirstPage)

    # ═══════════════════════════════════════════════════════════════════════
    # PAG 2: Structura turneu + Tabel inscriere echipe
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SectionHeader("1. STRUCTURA TURNEULUI", pw))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "Turneul este organizat pentru <b>20 de echipe</b> impartite in <b>4 grupe de cate 5 echipe</b>. "
        "Meciurile se joaca simultan pe 4 sub-terenuri. Primele 2 echipe din fiecare grupa avanseaza "
        "in sferturile de finala (8 echipe). Format: fotbal redus 7 vs 7.",
        body))
    story.append(Spacer(1, 0.3*cm))

    struct_data = [
        ['PARAMETRU', 'DETALII'],
        ['Nr. echipe', '20 echipe participante'],
        ['Format', 'Faza grupe + Eliminatorii (Sferturi / Semifinale / Finala)'],
        ['Nr. grupe', '4 grupe x 5 echipe (Grupa A, B, C, D)'],
        ['Nr. terenuri', '4 sub-terenuri (un teren mare impartit in 4)'],
        ['Tip joc', 'Fotbal redus 7 vs 7 (sau 5+1 la decizia organizatorului)'],
        ['Durata meci', '25 minute (fara pauza interna) + 5 minute pauza intre meciuri = 30 min/slot'],
        ['Durata totala turneu', '~9 ore (08:00 - 17:15)'],
        ['Meciuri grupe', '10 meciuri/grupa x 4 grupe = 40 meciuri'],
        ['Meciuri elim.', 'Sferturi (4) + Semifinale (2) + Finala mare + Loc 3 = 8 meciuri'],
        ['Total meciuri', '48 meciuri'],
        ['Taxa participare', '500 RON / echipa'],
        ['Locatie', 'Mosnita Noua, Judetul Timis'],
    ]
    story.append(styled_table(struct_data, [5*cm, pw-5*cm]))
    story.append(Spacer(1, 0.5*cm))

    # Diagrama teren
    story.append(SectionHeader("CONFIGURAREA TERENULUI", pw, bg=GREEN_MID))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "Terenul mare (ex. 70x100m) se divizeaza in 4 sub-terenuri prin marcaje temporare "
        "(jaloane, corzi, vopsea lavabila). Fiecare sub-teren are porturi proprii.",
        note))
    story.append(Spacer(1, 0.2*cm))
    fd = FootballField(w=pw*0.92, h=6.5*cm)
    t_fd = Table([[fd]], colWidths=[pw])
    t_fd.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(t_fd)
    story.append(Spacer(1, 0.4*cm))

    # Tabel inscrierea echipelor (gol)
    story.append(SectionHeader("TABEL INSCRIERE ECHIPE", pw, bg=BLUE))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("Completati tabelul de mai jos cu datele fiecarei echipe participante:", note))
    story.append(Spacer(1, 0.2*cm))

    reg_data = [['Nr.','Denumire Echipa','Localitate','Nr. Jucatori','Reprezentant','Telefon','Taxa platita']]
    for i in range(1, 21):
        reg_data.append([str(i), '', '', '', '', '', ''])

    cw_reg = [0.7*cm, 4.5*cm, 2.5*cm, 2.2*cm, 3.2*cm, 2.5*cm, 2.5*cm]
    t_reg = Table(reg_data, colWidths=cw_reg, repeatRows=1)
    t_reg.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), BLUE),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 7.5),
        ('ALIGN',        (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUND',(0,1), (-1,-1), [GRAY_LIGHT, colors.HexColor('#E3F2FD')]),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('GRID',         (0,0), (-1,-1), 0.5, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('ROWBACKGROUND',(0,1), (-1,-1), [WHITE, colors.HexColor('#EBF5FB')]),
    ]))
    story.append(t_reg)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # PAG 3: Componenta grupe + Program faza grupe
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SectionHeader("2. COMPONENTA GRUPELOR", pw))
    story.append(Spacer(1, 0.2*cm))

    grupe_data = [['GRUPA A\n(Terenul 1)','GRUPA B\n(Terenul 2)','GRUPA C\n(Terenul 3)','GRUPA D\n(Terenul 4)']]
    for i in range(5):
        grupe_data.append([
            f"{i+1}.  {GRUPE['A'][i]}",
            f"{i+1}.  {GRUPE['B'][i]}",
            f"{i+1}.  {GRUPE['C'][i]}",
            f"{i+1}.  {GRUPE['D'][i]}",
        ])
    cw4 = pw/4
    t_grupe = Table(grupe_data, colWidths=[cw4]*4, repeatRows=1)
    t_grupe.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-1), [GRAY_LIGHT, GREEN_PALE]),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 5),
    ]))
    story.append(t_grupe)
    story.append(Spacer(1, 0.5*cm))

    # Program faza grupe
    story.append(SectionHeader("3. PROGRAM MECIURI - FAZA GRUPELOR", pw))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Toate cele 4 grupe joaca <b>simultan</b>. 10 sloturi de cate 30 minute (25 min meci + 5 min pauza). "
        "Primele <b>2 echipe</b> din fiecare grupa avanseaza in sferturi.",
        note))
    story.append(Spacer(1, 0.25*cm))

    sch_data = [['Slot','Ora','TEREN 1 - Grupa A','TEREN 2 - Grupa B','TEREN 3 - Grupa C','TEREN 4 - Grupa D']]
    for slot, pa, pb, pc, pd in MATCH_SLOTS:
        t = (START + SLOT_DUR*(slot-1)).strftime('%H:%M')
        sch_data.append([f"#{slot}", t,
                         fmt_match(pa,'A'), fmt_match(pb,'B'),
                         fmt_match(pc,'C'), fmt_match(pd,'D')])

    cw_sch = [0.9*cm, 1.2*cm] + [(pw-2.1*cm)/4]*4
    t_sch = Table(sch_data, colWidths=cw_sch, repeatRows=1)
    t_sch.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUND',(0,1), (-1,-1), [GRAY_LIGHT, GREEN_PALE]),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 7.5),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 3),
        ('BOTTOMPADDING',(0,0), (-1,-1), 3),
        ('BACKGROUND',   (0,1), (1,-1), colors.HexColor('#E3F2FD')),
        ('FONTNAME',     (0,1), (1,-1), 'Helvetica-Bold'),
    ]))
    story.append(t_sch)
    story.append(Spacer(1, 0.4*cm))

    # Cronologia zilei
    story.append(SectionHeader("CRONOLOGIA ZILEI", pw, bg=GREEN_MID))
    story.append(Spacer(1, 0.2*cm))
    tl_data = [
        ['ORA','ACTIVITATE','DETALII'],
        ['08:00 - 09:00', 'Inregistrare echipe & incalzire', 'Primire echipe, completare acte, incalzire pe teren'],
        ['09:00 - 14:00', 'FAZA GRUPELOR (10 sloturi x 30 min)', '40 meciuri simultane pe 4 terenuri (25 min/meci + 5 min pauza)'],
        ['14:00 - 15:00', 'PAUZA DE PRANZ (1 ora)',            'Masa, odihna, anuntarea clasamentelor finale'],
        ['15:00 - 15:30', 'SFERTURI DE FINALA (4 meciuri)',    'Cate un meci pe teren, simultan - 25 minute'],
        ['15:35 - 16:05', 'SEMIFINALE (2 meciuri)',            'Pe Terenul 1 si Terenul 2 - 25 minute'],
        ['16:10 - 16:40', 'FINALA MICA + MAREA FINALA',        'Locul 3 pe T3, Finala mare pe T1 - 25 minute'],
        ['16:45 - 17:15', 'CEREMONIE DE PREMIERE',             'Trofee, medalii, fotografii oficiale'],
        ['17:15 - 18:00', 'Inchidere eveniment',               'Retragere echipe, curatenie teren'],
    ]
    tl_cw = [3.2*cm, 5.5*cm, pw-8.7*cm]
    t_tl = Table(tl_data, colWidths=tl_cw, repeatRows=1)
    t_tl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (0,-1), 'CENTER'),
        ('ALIGN',        (1,0), (-1,-1),'LEFT'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-1), [GRAY_LIGHT, GREEN_PALE]),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,1), (-1,-1), 5),
        # evidentiere
        ('BACKGROUND',   (0,2), (-1,2), colors.HexColor('#C8E6C9')),
        ('FONTNAME',     (0,2), (-1,2), 'Helvetica-Bold'),
        ('BACKGROUND',   (0,4), (-1,6), colors.HexColor('#FFF9C4')),
        ('FONTNAME',     (0,4), (-1,6), 'Helvetica-Bold'),
        ('BACKGROUND',   (0,7), (-1,7), colors.HexColor('#E8EAF6')),
    ]))
    story.append(t_tl)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # PAG 4: Faza eliminatorie
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SectionHeader("4. FAZA ELIMINATORIE", pw))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "Din faza grupelor avanseaza <b>primele 2 echipe din fiecare grupa</b> (8 echipe total). "
        "La egalitate dupa 2 reprize se trage la penaltiuri direct (format rapid, fara prelungiri).",
        body))
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("TABLOUL ELIMINATORIU", pw, bg=GREEN_MID))
    story.append(Spacer(1, 0.3*cm))
    bracket = KnockoutBracket(w=pw, h=10*cm)
    t_br = Table([[bracket]], colWidths=[pw])
    t_br.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER')]))
    story.append(t_br)
    story.append(Spacer(1, 0.4*cm))

    ko_data = [
        ['FAZA','MECI','ORA','TEREN','NOTA'],
        ['Sferturi','Loc 1 Gr.A  vs  Loc 2 Gr.D','15:00','Terenul 1','Castigatorul → SF1'],
        ['Sferturi','Loc 1 Gr.B  vs  Loc 2 Gr.C','15:00','Terenul 2','Castigatorul → SF1'],
        ['Sferturi','Loc 1 Gr.C  vs  Loc 2 Gr.B','15:00','Terenul 3','Castigatorul → SF2'],
        ['Sferturi','Loc 1 Gr.D  vs  Loc 2 Gr.A','15:00','Terenul 4','Castigatorul → SF2'],
        ['Semifinale','Castigatori QF 1 vs 2','15:35','Terenul 1','25 minute'],
        ['Semifinale','Castigatori QF 3 vs 4','15:35','Terenul 2','25 minute'],
        ['Locul 3','Invinsi semifinale','16:10','Terenul 3','Penaltiuri la egalitate'],
        ['FINALA','Castigatori semifinale','16:10','Terenul 1','25 minute'],
    ]
    ko_cw = [2.2*cm, 5.5*cm, 1.6*cm, 2.2*cm, pw-11.5*cm]
    t_ko = Table(ko_data, colWidths=ko_cw, repeatRows=1)
    t_ko.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('ALIGN',        (1,0), (1,-1), 'LEFT'),
        ('ALIGN',        (4,0), (4,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-1), [GRAY_LIGHT, GREEN_PALE]),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('BACKGROUND',   (0,8), (-1,8), GOLD_PALE),
        ('FONTNAME',     (0,8), (-1,8), 'Helvetica-Bold'),
        ('TEXTCOLOR',    (0,8), (-1,8), GOLD_DARK),
        ('BACKGROUND',   (0,5), (-1,6), colors.HexColor('#FFF3E0')),
    ]))
    story.append(t_ko)
    story.append(Spacer(1, 0.4*cm))

    # Regulament
    story.append(SectionHeader("REGULAMENT SINTETIC", pw, bg=GREEN_MID))
    story.append(Spacer(1, 0.2*cm))
    reg2 = [
        ['ASPECT','REGULA'],
        ['Jucatori pe teren','7 (6 jucatori de camp + 1 portar); varianta 5+1 acceptata'],
        ['Punctaj grupe','Victorie = 3 pct  |  Egal = 1 pct  |  Infrangere = 0 pct'],
        ['Departajare','Puncte > Golaveraj > Goluri marcate > Confruntare directa'],
        ['Egalitate in eliminatorii','Penaltiuri direct (fara prelungiri - format rapid)'],
        ['Portarul','Max 4 secunde cu mingea in mana; distributie cu mana permisa'],
        ['Cartonase','Galben: avertisment  |  Rosu: eliminare (fara inlocuire)'],
        ['Echipament','Echipament uniform obligatoriu; arbitrul decide la conflict culori'],
    ]
    story.append(styled_table(reg2, [4*cm, pw-4*cm], hbg=GREEN_MID))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # PAG 5: Venituri din taxa de participare
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SectionHeader("5. PLAN FINANCIAR - VENITURI DIN TAXA DE PARTICIPARE", pw))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "Singura sursa <b>garantata</b> de venit pentru organizator este taxa de participare. "
        "Toate celelalte venituri sunt <b>optionale</b> si depind de efortul de promovare "
        "(a se vedea pagina urmatoare).",
        body))
    story.append(Spacer(1, 0.4*cm))

    # Tabel detaliat taxa
    story.append(SectionHeader("DETALIERE TAXA PARTICIPARE", pw, bg=GREEN_MID))
    story.append(Spacer(1, 0.2*cm))
    taxa_data = [
        ['Nr.crt.', 'Echipa', 'Taxa (RON)', 'Data platii', 'Confirmat'],
    ]
    for i in range(1, 21):
        taxa_data.append([str(i), f'Echipa {i}', '500', '', ''])

    taxa_data.append(['','TOTAL VENITURI GARANTATE','10.000 RON','',''])

    tax_cw = [1*cm, 6*cm, 3*cm, 4*cm, pw-14*cm]
    t_taxa = Table(taxa_data, colWidths=tax_cw, repeatRows=1)
    t_taxa.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('ALIGN',        (1,0), (1,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-2), [WHITE, colors.HexColor('#E8F5E9')]),
        ('GRID',         (0,0), (-1,-1), 0.5, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        # Total row
        ('BACKGROUND',   (0,-1),(-1,-1), colors.HexColor('#C8E6C9')),
        ('FONTNAME',     (0,-1),(-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,-1),(-1,-1), 10),
        ('TEXTCOLOR',    (2,-1),(2,-1),  GREEN_DARK),
        ('SPAN',         (1,-1),(2,-1)),
    ]))
    story.append(t_taxa)
    story.append(Spacer(1, 0.4*cm))

    # Sumar
    story.append(SectionHeader("SUMAR VENITURI GARANTATE", pw, bg=GREEN_MID))
    story.append(Spacer(1, 0.2*cm))
    sum_data = [
        ['ELEMENT','VALOARE'],
        ['Nr. echipe inscrise','20 echipe'],
        ['Taxa per echipa','500 RON'],
        ['TOTAL VENITURI GARANTATE','10.000 RON'],
        ['Observatie','Suma colectata inainte de eveniment prin confirmare inscriere'],
    ]
    t_sum = Table(sum_data, colWidths=[pw*0.5, pw*0.5])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 9),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 9),
        ('GRID',         (0,0), (-1,-1), 0.5, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0), (-1,-1), 6),
        ('BACKGROUND',   (0,3), (-1,3), colors.HexColor('#A5D6A7')),
        ('FONTNAME',     (0,3), (-1,3), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,3), (-1,3), 12),
        ('TEXTCOLOR',    (0,3), (-1,3), GREEN_DARK),
        ('BACKGROUND',   (0,4), (-1,4), GRAY_LIGHT),
        ('FONTSIZE',     (0,4), (-1,4), 7.5),
        ('TEXTCOLOR',    (0,4), (-1,4), GRAY_DARK),
    ]))
    story.append(t_sum)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # PAG 6: Venituri optionale
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SectionHeader("6. VENITURI OPTIONALE - SURSE SUPLIMENTARE DE FINANTARE", pw))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "Urmatoarele surse de venit sunt <b>optionale</b> si necesita efort suplimentar de organizare. "
        "Implementarea lor poate transforma turneul dintr-un eveniment la limita intr-unul profitabil.",
        body))
    story.append(Spacer(1, 0.4*cm))

    opt_data = [
        ['#','SURSA DE VENIT','DESCRIERE','POTENTIAL (RON)','DIFICULTATE'],
        ['1','Sponsorizare principala',
         'Denumire turneu dupa sponsor, banner mare, anunt MC',
         '2.000 - 5.000', 'Medie'],
        ['2','Sponsorizari secundare (2-3 firme)',
         'Logo pe afis oficial, anunt verbal, masa la eveniment',
         '500 - 1.500', 'Mica'],
        ['3','Bilete spectatori',
         '300 spectatori x 10 RON; zona delimitata spectatori',
         '2.000 - 3.000', 'Mica'],
        ['4','Vanzare apa si suc',
         'Cumparate en-gros, vandute cu marja; necesita stand si personal',
         '800 - 1.500', 'Mica'],
        ['5','Vanzare mancare (sandvisuri, hot-dog)',
         'Stand propriu sau subinchiriat unui comerciant',
         '500 - 1.600', 'Medie'],
        ['6','Tombola cu premii',
         'Premii donate de firme locale; bilete 10 RON x 200 buc',
         '1.000 - 2.000', 'Mica'],
        ['7','Fotografie / video profesional',
         'Pachete foto echipe (portret + actiune): 50 RON/echipa',
         '300 - 800', 'Mica'],
        ['8','Stand firme externe (gratar, inghetata)',
         'Inchiriere spatiu comerciant extern: 200-500 RON/stand',
         '400 - 1.000', 'Mica'],
        ['9','Parcare organizata',
         '5-10 RON/masina; estimat 100 masini',
         '300 - 500', 'Mica'],
        ['10','Concurs penaltiuri (separat)',
         '20 RON/participant; premiu 200 RON; marja ~50%',
         '200 - 500', 'Mica'],
        ['11','Naming rights competitie',
         '"Turneul [Sponsor] 2026" - sponsor cumpara denumirea',
         '1.000 - 5.000', 'Mare'],
        ['12','Live streaming YouTube / Facebook',
         'Monetizare vizualizari sau acces premium pentru echipe',
         '100 - 500', 'Mare'],
    ]
    opt_cw = [0.6*cm, 4*cm, 5.5*cm, 3*cm, 2.5*cm]
    # Ajustat la latime pagina
    total_opt = sum(opt_cw)
    if total_opt < pw:
        opt_cw[-1] += pw - total_opt

    t_opt = Table(opt_data, colWidths=opt_cw, repeatRows=1)
    t_opt.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), PURPLE),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8.5),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('ALIGN',        (1,0), (2,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-1), [GRAY_LIGHT, colors.HexColor('#F3E5F5')]),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('TEXTCOLOR',    (3,1), (3,-1), GREEN_DARK),
        ('FONTNAME',     (3,1), (3,-1), 'Helvetica-Bold'),
    ]))
    story.append(t_opt)
    story.append(Spacer(1, 0.4*cm))

    # Grafic optional
    story.append(SectionHeader("GRAFIC POTENTIAL VENITURI OPTIONALE (RON)", pw, bg=PURPLE))
    story.append(Spacer(1, 0.2*cm))
    chrt = OptRevChart(w=pw, h=6*cm)
    t_chrt = Table([[chrt]], colWidths=[pw])
    t_chrt.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER')]))
    story.append(t_chrt)
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph(
        "<b>Nota:</b> Valorile din grafic reprezinta estimari medii. Cu sponsorizari active si "
        "bilete spectatori, turneul poate genera <b>10.000 - 16.000 RON venituri totale</b> "
        "(taxa + optionale), inainte de cheltuieli.",
        note))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # PAG 7: Cheltuieli - Arbitri + Cadre medicale
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SectionHeader("7. PLAN CHELTUIELI - ARBITRI SI CADRE MEDICALE", pw))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "In conformitate cu cerintele minime de organizare a competitiei, cheltuielile "
        "obligatorii sunt cele cu <b>arbitrajul</b> si <b>asistenta medicala</b>. "
        "Acestea trebuie contractate in avans si platite indiferent de numarul de participanti.",
        body))
    story.append(Spacer(1, 0.4*cm))

    # ─ Arbitri ─
    story.append(SectionHeader("7.1  CHELTUIELI CU ARBITRII", pw, bg=RED))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Fiecare sub-teren necesita <b>1 arbitru central</b> (obligatoriu) si, recomandat, "
        "<b>1 arbitru asistent</b>. Pentru faza eliminatorie, arbitrii pot fi redistributi. "
        "Tarifele sunt orientative - verificati cu <b>Colegiul Judetean de Arbitri Timis</b>.",
        note))
    story.append(Spacer(1, 0.2*cm))

    arb_data = [
        ['#','DETALIU','CALCUL','SUMA (RON)'],
        ['1','Arbitri centrali faza grupe',
         '4 terenuri x 1 arbitru x 200 RON/zi', '800'],
        ['2','Arbitri asistenti faza grupe (optional)',
         '4 terenuri x 1 asistent x 100 RON/zi', '400'],
        ['3','Arbitri faza eliminatorie (sferturi, sf, finala)',
         '4 meciuri QF + 2 SF + 2 finale x 1 arb x 150 RON', '1.200'],
        ['4','Arbitru rezerva / observator',
         '1 persoana x 150 RON', '150'],
        ['5','Deplasare + diurna (daca arbitrii vin din alt oras)',
         'Estimat 50 RON/persoana x 10 persoane', '500'],
        ['','TOTAL ARBITRI (varianta completa - 2 arbitri/teren)','','3.050 RON'],
        ['','TOTAL ARBITRI (varianta minima - 1 arbitru/teren)','','2.650 RON'],
    ]
    arb_cw = [0.6*cm, 6.5*cm, 5*cm, pw-12.1*cm]
    t_arb = Table(arb_data, colWidths=arb_cw, repeatRows=1)
    t_arb.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), RED),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('ALIGN',        (1,0), (2,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-2), [GRAY_LIGHT, colors.HexColor('#FFEBEE')]),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('BACKGROUND',   (0,-2),(-1,-2), colors.HexColor('#FFCDD2')),
        ('FONTNAME',     (0,-2),(-1,-2), 'Helvetica-Bold'),
        ('TEXTCOLOR',    (3,-2),(3,-2),  RED),
        ('BACKGROUND',   (0,-1),(-1,-1), colors.HexColor('#FFEBEE')),
        ('FONTNAME',     (0,-1),(-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR',    (3,-1),(3,-1),  RED),
    ]))
    story.append(t_arb)
    story.append(Spacer(1, 0.5*cm))

    # ─ Cadre medicale ─
    story.append(SectionHeader("7.2  CHELTUIELI CU CADRELE MEDICALE", pw, bg=colors.HexColor('#B71C1C')))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Prezenta asistentei medicale este <b>obligatorie</b> la competitiile sportive conform "
        "normelor ISU si regulamentelor sportive in vigoare. "
        "Fara asistenta medicala prezenta, evenimentul nu poate fi desfasurat legal.",
        note))
    story.append(Spacer(1, 0.2*cm))

    med_data = [
        ['#','DETALIU','CALCUL','SUMA (RON)'],
        ['1','Medic sportiv sau asistent medical (obligatoriu)',
         '1 cadru medical x 8 ore x 80 RON/ora', '640'],
        ['2','Cadru medical suplimentar (recomandat la 4 terenuri)',
         '1 cadru x 8 ore x 80 RON/ora', '640'],
        ['3','Truse prim ajutor (consumabile)',
         '4 truse x 50 RON (benzi, comprese, apa oxigenata etc.)', '200'],
        ['4','Gheata medicala / pungi criogene',
         '20 bucati x 3 RON', '60'],
        ['5','Targa / scaun de urgenta (inchiriere sau propriu)',
         'Inchiriere echipament urgenta', '150'],
        ['6','Ambulanta SMURD / prim ajutor (daca se solicita)',
         'Voluntari ISU - gratuit sau taxa simbolica', '0 - 300'],
        ['','TOTAL CADRE MEDICALE (2 cadre, fara ambulanta)','','1.690 RON'],
        ['','TOTAL CADRE MEDICALE (1 cadru, varianta minima)','','1.050 RON'],
    ]
    med_cw = [0.6*cm, 6.5*cm, 5*cm, pw-12.1*cm]
    t_med = Table(med_data, colWidths=med_cw, repeatRows=1)
    t_med.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), colors.HexColor('#B71C1C')),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('ALIGN',        (1,0), (2,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUND',(0,1), (-1,-2), [GRAY_LIGHT, colors.HexColor('#FFEBEE')]),
        ('GRID',         (0,0), (-1,-1), 0.4, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('BACKGROUND',   (0,-2),(-1,-2), colors.HexColor('#FFCDD2')),
        ('FONTNAME',     (0,-2),(-1,-2), 'Helvetica-Bold'),
        ('TEXTCOLOR',    (3,-2),(3,-2),  RED),
        ('BACKGROUND',   (0,-1),(-1,-1), colors.HexColor('#FFEBEE')),
        ('FONTNAME',     (0,-1),(-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR',    (3,-1),(3,-1),  RED),
    ]))
    story.append(t_med)
    story.append(Spacer(1, 0.5*cm))

    # ─ Sumar cheltuieli obligatorii ─
    story.append(SectionHeader("7.3  SUMAR CHELTUIELI OBLIGATORII", pw, bg=GREEN_DARK))
    story.append(Spacer(1, 0.2*cm))
    chelt_sumar = [
        ['CATEGORIE','VARIANTA MINIMA','VARIANTA COMPLETA'],
        ['Arbitri','2.650 RON','3.050 RON'],
        ['Cadre medicale','1.050 RON','1.690 RON'],
        ['TOTAL CHELTUIELI OBLIGATORII','3.700 RON','4.740 RON'],
        ['Venituri garantate (taxa participare)','10.000 RON','10.000 RON'],
        ['SOLD DUPA CHELTUIELI OBLIGATORII','+6.300 RON','+5.260 RON'],
    ]
    t_cs = Table(chelt_sumar, colWidths=[pw*0.45, pw*0.275, pw*0.275])
    t_cs.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), GREEN_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 9),
        ('ALIGN',        (0,0), (-1,-1),'CENTER'),
        ('VALIGN',       (0,0), (-1,-1),'MIDDLE'),
        ('FONTNAME',     (0,1), (-1,-1),'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 9),
        ('GRID',         (0,0), (-1,-1), 0.5, GRAY_MED),
        ('LINEBELOW',    (0,0), (-1,0),  1.5, GOLD),
        ('TOPPADDING',   (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0), (-1,-1), 6),
        ('BACKGROUND',   (0,1), (-1,1), colors.HexColor('#FFEBEE')),
        ('BACKGROUND',   (0,2), (-1,2), colors.HexColor('#FFEBEE')),
        ('BACKGROUND',   (0,3), (-1,3), colors.HexColor('#FFCDD2')),
        ('FONTNAME',     (0,3), (-1,3), 'Helvetica-Bold'),
        ('TEXTCOLOR',    (1,3), (2,3),  RED),
        ('FONTSIZE',     (1,3), (2,3),  10),
        ('BACKGROUND',   (0,4), (-1,4), colors.HexColor('#C8E6C9')),
        ('BACKGROUND',   (0,5), (-1,5), colors.HexColor('#A5D6A7')),
        ('FONTNAME',     (0,5), (-1,5), 'Helvetica-Bold'),
        ('FONTSIZE',     (1,5), (2,5),  11),
        ('TEXTCOLOR',    (1,5), (2,5),  GREEN_DARK),
    ]))
    story.append(t_cs)
    story.append(Spacer(1, 0.4*cm))

    story.append(DecorativeLine(pw))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "<b>Concluzie:</b> Din taxa de participare de 10.000 RON, dupa acoperirea cheltuielilor "
        "obligatorii (arbitri + cadre medicale), ramane un sold pozitiv de "
        "<b>5.260 - 6.300 RON</b>. Aceasta suma poate fi folosita pentru trofee, mingi, "
        "amenajarea terenului si alte cheltuieli optionale, sau reinvestita in clubul CSC Mosnita. "
        "Cu venituri optionale activate, profitul total poate depasi <b>10.000 RON</b>.",
        body))

    contact_s = ParagraphStyle('ctr', parent=styles()[2], alignment=TA_CENTER)
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("CSC Mosnita  -  Mosnita Noua, Judetul Timis", contact_s))

    return story


# ── Main ─────────────────────────────────────────────────────────────────────
def generate():
    out = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "TURNEU_FOTBAL_CSC_Mosnita_2026.pdf"
    )
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.6*cm,  bottomMargin=1.3*cm,
        title="Plan Turneu de Fotbal - CSC Mosnita 2026",
        author="CSC Mosnita",
        subject="Plan organizare turneu fotbal 20 echipe",
    )
    pw = PAGE_W - doc.leftMargin - doc.rightMargin
    story = build_story(pw)
    doc.build(story, onFirstPage=draw_cover, onLaterPages=draw_page_decor)
    sz = os.path.getsize(out)
    print(f"\n PDF generat: {out}")
    print(f"   Dimensiune: {sz:,} bytes  |  ~{sz//1024} KB")
    return out


if __name__ == "__main__":
    generate()
