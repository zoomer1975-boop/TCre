from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    Image as RLImage,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SCREENSHOTS = DOCS / "manual-screenshots"
OUT = DOCS / "tcredit-site-user-manual.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 15 * mm
MARGIN_Y = 15 * mm
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)

FONT_REGULAR = "Malgun"
FONT_BOLD = "Malgun-Bold"


def register_fonts():
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, r"C:\Windows\Fonts\malgun.ttf"))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, r"C:\Windows\Fonts\malgunbd.ttf"))


class Rule(Flowable):
    def __init__(self, color=colors.HexColor("#d8e0ea"), width=CONTENT_WIDTH):
        super().__init__()
        self.color = color
        self.width = width
        self.height = 1

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(0.6)
        self.canv.line(0, 0, self.width, 0)


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_brand": ParagraphStyle(
            "cover_brand",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#00765d"),
            spaceAfter=60,
        ),
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#00765d"),
            spaceAfter=8,
        ),
        "title": ParagraphStyle(
            "title",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=30,
            leading=39,
            textColor=colors.HexColor("#071832"),
            spaceAfter=13,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=13,
            leading=20,
            textColor=colors.HexColor("#52627a"),
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName=FONT_BOLD,
            fontSize=18,
            leading=25,
            textColor=colors.HexColor("#071832"),
            spaceBefore=13,
            spaceAfter=7,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#071832"),
            spaceBefore=9,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=9.4,
            leading=15,
            textColor=colors.HexColor("#071832"),
            spaceAfter=5,
            alignment=TA_LEFT,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.1,
            leading=12,
            textColor=colors.HexColor("#52627a"),
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.8,
            leading=11,
            textColor=colors.HexColor("#52627a"),
            spaceBefore=3,
            spaceAfter=8,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.1,
            leading=12,
            textColor=colors.HexColor("#071832"),
        ),
        "cell_bold": ParagraphStyle(
            "cell_bold",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.1,
            leading=12,
            textColor=colors.HexColor("#071832"),
        ),
    }


def p(text, style):
    return Paragraph(text, style)


def note(text, st, tone="green"):
    border = colors.HexColor("#00765d" if tone == "green" else "#b45309")
    fill = colors.HexColor("#eef8f4" if tone == "green" else "#fff7ed")
    table = Table([[p(text, st["body"])]], colWidths=[CONTENT_WIDTH])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.25, colors.HexColor("#cfe7df")),
                ("LINEBEFORE", (0, 0), (0, -1), 4, border),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def table(data, st, widths=None):
    rows = []
    for row_index, row in enumerate(data):
        row_style = st["cell_bold"] if row_index == 0 else st["cell"]
        rows.append([p(str(cell), row_style) for cell in row])
    result = Table(rows, colWidths=widths or [CONTENT_WIDTH / len(data[0])] * len(data[0]), repeatRows=1)
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf3f6")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d8e0ea")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return result


def bullet_list(items, st):
    return ListFlowable(
        [ListItem(p(item, st["body"]), leftIndent=12) for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName=FONT_REGULAR,
        bulletFontSize=7,
    )


def image_block(filename, caption, st):
    path = SCREENSHOTS / filename
    with Image.open(path) as img:
        width, height = img.size
    max_width = CONTENT_WIDTH
    max_height = 138 * mm
    scale = min(max_width / width, max_height / height)
    pic = RLImage(str(path), width=width * scale, height=height * scale)
    pic.hAlign = "CENTER"
    return KeepTogether([pic, p(caption, st["caption"])])


def section_title(text, st):
    return [Rule(), p(text, st["h1"])]


def build():
    register_fonts()
    st = styles()
    story = []

    story.append(p("Keimyung Univ. · T-Credit", st["cover_brand"]))
    story.append(Spacer(1, 40 * mm))
    story.append(p("사이트 이용 매뉴얼", st["cover_kicker"]))
    story.append(p("TCredit<br/>역할별 입력 및 확인 절차", st["title"]))
    story.append(
        p(
            "공헌 등록, 추천 의견, 승인 처리, 위원회 심의, 관리자 확인 화면을 실제 로컬 사이트 화면 캡처와 함께 정리한 운영 매뉴얼입니다.",
            st["subtitle"],
        )
    )
    story.append(
        table(
            [
                ["기준 화면", "작성일", "대상"],
                ["http://localhost:3000", "2026년 6월 8일", "시범운영 사용자 및 운영자"],
            ],
            st,
            [CONTENT_WIDTH / 3] * 3,
        )
    )
    story.append(Spacer(1, 55 * mm))
    story.append(
        note(
            "본 문서는 현재 로컬 TCredit 사이트와 라이브 PostgreSQL 데이터를 기준으로 작성했습니다. 화면의 공헌 건수, 사용자 이름, 대기 건수는 운영 데이터 변경에 따라 달라질 수 있습니다.",
            st,
        )
    )
    story.append(PageBreak())

    story.extend(section_title("빠른 시작", st))
    story.append(
        table(
            [
                ["단계", "사용자가 하는 일"],
                ["1. 계정 선택", "상단 사용자 이름을 눌러 역할별 계정으로 전환합니다."],
                ["2. 공헌 입력", "공헌자 계정에서 제목, 유형, 활동일, 관련 부서, Tier, 내용을 입력합니다."],
                ["3. 추천 확인", "추천자로 지정된 사용자는 공헌 내역 화면에서 추천 의견을 입력합니다."],
                ["4. 승인 처리", "승인권자는 추천 내용을 확인하고 점수, Tier, 의견을 입력한 뒤 승인 또는 반려합니다."],
                ["5. 심의/관리", "위원회와 관리자는 이상 사례, 예산, 사용자 권한, 임계값을 확인합니다."],
                ["6. 결과 확인", "공헌 내역과 운영 현황에서 상태와 Credit 반영 결과를 확인합니다."],
            ],
            st,
            [42 * mm, CONTENT_WIDTH - 42 * mm],
        )
    )
    story.append(Spacer(1, 8))
    story.append(image_block("01-dashboard-admin.png", "운영 현황: 전체 공헌 로그, 승인 대기 건수, 승인 완료 Credit을 한 화면에서 확인합니다.", st))

    story.extend(section_title("역할과 기본 메뉴", st))
    story.append(
        table(
            [
                ["역할", "주요 메뉴", "주요 작업", "예시 계정"],
                ["CONTRIBUTOR 공헌자", "운영 현황, 공헌 입력, 공헌 내역", "공헌 등록, 본인 상태 확인, 추천 의견 입력", "김하늘, 이서연"],
                ["APPROVER 승인권자", "승인 처리, 승인자 조회", "관련 부서 승인 대기 공헌 검토, Credit 확정", "오지훈, 박도윤, 공과대 학장"],
                ["COMMITTEE 위원회", "위원회 심의", "비공개 의견, 이상 사례, 표본감사, 이의신청 확인", "정민준, 최유진"],
                ["ADMIN 관리자", "관리자", "사용자와 권한, 조직, 예산 풀, 심의 임계값 확인", "최유진"],
            ],
            st,
            [30 * mm, 42 * mm, 76 * mm, CONTENT_WIDTH - 148 * mm],
        )
    )

    story.append(PageBreak())
    story.extend(section_title("공헌자: 공헌 입력", st))
    story.append(p("공헌자는 실제 기여 내용을 등록하고, 필요한 경우 동료 추천인을 지정합니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "<b>메뉴 이동:</b> 좌측 메뉴에서 공헌 입력을 선택합니다.",
                "<b>기본 정보 입력:</b> 공헌 제목, 공헌 유형, 활동일, 관련 부서, Effort Tier를 입력합니다.",
                "<b>공헌 내용 작성:</b> 기여 배경, 수행 내용, 협업 부서, 결과를 승인자가 판단할 수 있을 만큼 구체적으로 작성합니다.",
                "<b>추천인 선택:</b> 추천이 필요한 경우 추천인을 고르고 추가를 누릅니다.",
                "<b>제출:</b> 오른쪽 산정 미리보기에서 예상 Credit을 확인한 뒤 제출을 누릅니다.",
            ],
            st,
        )
    )
    story.append(image_block("03-contribution-input-filled.png", "공헌 입력: 제목, 유형, 활동일, 관련 부서, Tier, 공헌 내용, 추천인을 입력합니다.", st))
    story.append(
        note(
            "추천인을 선택하면 공헌은 먼저 추천 대기 흐름으로 이동합니다. 추천인이 의견을 저장하면 승인권자가 검토할 수 있는 승인 대기 상태로 넘어갑니다.",
            st,
        )
    )

    story.append(PageBreak())
    story.extend(section_title("공헌자/추천자: 공헌 내역 확인 및 추천 의견", st))
    story.append(p("공헌 내역 화면은 본인의 공헌 상태를 확인하는 화면이면서, 추천자로 지정된 사람이 추천 의견을 입력하는 화면이기도 합니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "누적 승인 Credit, 입력 공헌 수, 추천 요청 수를 확인합니다.",
                "제목, 내용, 부서, 유형 검색어와 시작/종료일을 입력해 공헌 목록을 좁힙니다.",
                "각 공헌의 상태 배지를 확인합니다. 상태 옆 물음표 아이콘은 상태 의미와 다음 단계를 설명합니다.",
                "추천 요청이 있는 경우 하단 추천 의견 입력 영역에 의견을 작성하고, 필요하면 비공개 의견으로 제출합니다.",
            ],
            st,
        )
    )
    story.append(image_block("04-my-contributions.png", "공헌 내역: 본인의 입력 공헌과 상태를 확인합니다.", st))
    story.append(p("상태 흐름", st["h2"]))
    story.append(
        table(
            [
                ["상태", "의미"],
                ["추천 대기", "추천인이 의견을 입력해야 하는 단계"],
                ["승인 대기", "승인권자가 점수와 Credit을 검토하는 단계"],
                ["승인", "Credit이 확정되어 내역에 반영된 상태"],
                ["반려", "공헌 인정 대상이 아니거나 보완이 필요한 상태"],
                ["입력기한 초과", "활동일 기준 30일을 초과해 일반 승인 대상에서 제외된 상태"],
                ["위원회 검토", "이의신청, 비공개 의견, 이상 사례 검토 단계"],
            ],
            st,
            [42 * mm, CONTENT_WIDTH - 42 * mm],
        )
    )

    story.append(PageBreak())
    story.extend(section_title("승인권자: 승인 처리", st))
    story.append(p("승인권자는 자신이 담당하는 관련 부서의 승인 대기 공헌을 검토합니다. 관리자는 전체 범위의 승인 대기 건을 볼 수 있습니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "승인 처리 메뉴에서 처리 가능한 공헌을 확인합니다.",
                "공헌 내용과 공개/비공개 추천 의견을 검토합니다.",
                "참여, 성과, 효과 체크 여부와 최종 Tier를 조정합니다.",
                "승인/반려 의견을 입력합니다.",
                "승인 또는 반려 버튼을 누르고 확인 창에서 최종 제출합니다.",
            ],
            st,
        )
    )
    story.append(image_block("05-approval-workbench.png", "승인 처리: 추천 의견을 확인하고 점수와 최종 Tier를 조정해 승인 Credit을 산정합니다.", st))

    story.extend(section_title("승인권자: 승인자 조회", st))
    story.append(
        bullet_list(
            [
                "승인율은 현재 계정이 처리한 승인/반려 결정 기준으로 계산됩니다.",
                "발행 Credit은 승인 결정으로 누적 발행된 Credit입니다.",
                "참고 사항은 승인 대기 건수나 운영상 점검 조건을 안내합니다.",
                "승인 내역에서는 처리한 건을 확인하고 항목을 펼쳐 공헌 내용을 확인합니다.",
            ],
            st,
        )
    )
    story.append(image_block("06-approver-insights.png", "승인자 조회: 승인율, 발행 Credit, 반려 건수, 월별 처리 현황, 승인 내역을 확인합니다.", st))

    story.append(PageBreak())
    story.extend(section_title("위원회: 심의 및 표본감사 확인", st))
    story.append(
        bullet_list(
            [
                "심의 대기에서 이상 징후, 반려 이의신청, 위원회 검토 대상 건수를 확인합니다.",
                "비공개 의견 수와 검토자료를 확인합니다.",
                "이상 사례 큐에서 신호 유형, 심각도, 공헌 내용을 확인합니다.",
                "무작위 표본감사 대상 공헌과 Credit 규모를 확인합니다.",
            ],
            st,
        )
    )
    story.append(image_block("07-committee-review.png", "위원회 심의: 비공개 의견, 표본감사, 이의신청 현황을 확인합니다.", st))

    story.extend(section_title("관리자: 사용자, 권한, 예산 확인", st))
    story.append(
        bullet_list(
            [
                "사용자 이름, 사번, 소속, 직책, 역할을 확인합니다.",
                "운영 기간, 총 예산, 1 Credit 명목가치, 발행 가능 Credit을 확인합니다.",
                "승인권자 편중, 반려 비율, 중복 승인 요청, 월말 승인 집중도 등 위원회 점검 조건을 확인합니다.",
                "특정 부서의 승인 대기 공헌이 보이지 않으면 해당 부서에 APPROVER 역할 사용자가 있는지 확인합니다.",
            ],
            st,
        )
    )
    story.append(image_block("08-admin-settings.png", "관리자 설정: 사용자 및 권한, 예산 풀, 심의 임계값을 확인합니다.", st))

    story.append(PageBreak())
    story.extend(section_title("운영 체크리스트", st))
    story.append(
        table(
            [
                ["상황", "확인할 화면", "조치 기준"],
                ["공헌 제출 후 승인권자에게 보이지 않음", "공헌 내역, 승인 처리, 관리자", "추천인이 지정된 건이면 추천 의견 제출 후 승인 대기로 이동합니다. 관련 부서와 승인권자 소속이 일치하는지도 확인합니다."],
                ["추천 의견 입력 영역이 비어 있음", "공헌 내역", "현재 사용자에게 요청된 추천 의견이 없거나, 이미 제출되어 대기 목록에서 사라진 상태입니다."],
                ["Credit이 예상과 다름", "승인 처리, 공헌 내역", "최종 Credit은 승인권자가 참여, 성과, 효과 점수와 최종 Tier를 조정한 결과입니다."],
                ["입력기한 초과 상태 표시", "공헌 내역, 운영 현황", "활동일 기준 30일을 초과한 입력 건은 일반 승인 대상이 아니라 unbillable로 분류됩니다."],
                ["위원회 검토가 필요한 경우", "위원회 심의", "비공개 의견, 이상 사례, 이의신청, 표본감사 대상을 확인하고 운영 정책에 따라 후속 처리합니다."],
            ],
            st,
            [43 * mm, 40 * mm, CONTENT_WIDTH - 83 * mm],
        )
    )
    story.append(Spacer(1, 8))
    story.append(
        note(
            "실제 운영 배포 환경에서는 계정 전환 드롭다운이 비활성화될 수 있습니다. 시범운영 또는 개발 환경에서는 역할별 검증을 위해 계정 전환 기능을 사용할 수 있습니다.",
            st,
            tone="orange",
        )
    )
    story.append(p("문서 기준: TCredit 로컬 사이트, PostgreSQL 라이브 데이터, 2026년 6월 8일 캡처.", st["small"]))

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        rightMargin=MARGIN_X,
        leftMargin=MARGIN_X,
        topMargin=MARGIN_Y,
        bottomMargin=MARGIN_Y,
        title="TCredit 사이트 이용 매뉴얼",
        author="TCredit",
    )
    doc.build(story)


def build_menu_chapter_version():
    register_fonts()
    st = styles()
    story = []

    story.append(p("Keimyung Univ. · T-Credit", st["cover_brand"]))
    story.append(Spacer(1, 40 * mm))
    story.append(p("사이트 이용 매뉴얼", st["cover_kicker"]))
    story.append(p("TCredit<br/>대메뉴별 이용 절차", st["title"]))
    story.append(
        p(
            "좌측 대메뉴를 기준으로 각 기능을 새 장에서 시작하도록 구성한 운영 매뉴얼입니다. 공헌 입력, 내역 확인, 승인 처리, 승인자 조회는 현재 구현 화면 기준으로 설명하고, 위원회 심의와 관리자 기능은 추후 개발 항목으로 표시합니다.",
            st["subtitle"],
        )
    )
    story.append(
        table(
            [
                ["기준 화면", "작성일", "대상"],
                ["http://localhost:3000", "2026년 6월 9일", "시범운영 사용자 및 운영자"],
            ],
            st,
            [CONTENT_WIDTH / 3] * 3,
        )
    )
    story.append(Spacer(1, 55 * mm))
    story.append(
        note(
            "본 문서는 현재 로컬 TCredit 사이트와 라이브 PostgreSQL 데이터를 기준으로 작성했습니다. 화면의 공헌 건수, 사용자 이름, 대기 건수는 운영 데이터 변경에 따라 달라질 수 있습니다.",
            st,
        )
    )
    story.append(PageBreak())

    story.extend(section_title("매뉴얼 구성", st))
    story.append(
        table(
            [
                ["대메뉴", "현재 문서 처리"],
                ["운영 현황", "현재 구현 화면 기준으로 확인 방법 설명"],
                ["공헌 입력", "현재 구현 화면 기준으로 입력 방법 설명"],
                ["공헌 내역", "현재 구현 화면 기준으로 조회 및 추천 의견 설명"],
                ["승인 처리", "현재 구현 화면 기준으로 승인/반려 절차 설명"],
                ["승인자 조회", "현재 구현 화면 기준으로 승인 현황 조회 설명"],
                ["위원회 심의", "추후 개발 기능으로 표시"],
                ["관리자", "추후 개발 기능으로 표시"],
            ],
            st,
            [42 * mm, CONTENT_WIDTH - 42 * mm],
        )
    )
    story.append(Spacer(1, 8))
    story.append(
        table(
            [
                ["역할", "사용 가능한 주요 대메뉴", "예시 계정"],
                ["CONTRIBUTOR 공헌자", "운영 현황, 공헌 입력, 공헌 내역", "김하늘, 이서연"],
                ["APPROVER 승인권자", "승인 처리, 승인자 조회", "오지훈, 박도윤, 공과대 학장"],
                ["COMMITTEE 위원회", "위원회 심의", "정민준, 최유진"],
                ["ADMIN 관리자", "관리자", "최유진"],
            ],
            st,
            [38 * mm, 92 * mm, CONTENT_WIDTH - 130 * mm],
        )
    )

    story.append(PageBreak())
    story.extend(section_title("운영 현황", st))
    story.append(p("운영 현황은 TCredit 접속 후 처음 확인하는 대시보드입니다. 전체 공헌 로그, 승인 완료 건수, 승인 대기 건수, 발행 Credit을 한 화면에서 확인합니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "상단 사용자 정보와 내 누적 Credits를 확인합니다.",
                "좌측 메뉴의 빨간 배지는 처리 대기 건수를 의미합니다.",
                "최근 공헌 로그에서 공헌자, 유형, 관련 부서, 상태, Credit을 확인합니다.",
                "상태 옆 물음표 아이콘을 통해 상태 의미와 다음 단계를 확인합니다.",
                "새 공헌을 등록하려면 우측 상단 또는 좌측 메뉴의 공헌 입력을 선택합니다.",
            ],
            st,
        )
    )
    story.append(image_block("01-dashboard-admin.png", "운영 현황: 전체 공헌 로그와 승인 대기 상태를 확인합니다.", st))

    story.append(PageBreak())
    story.extend(section_title("공헌 입력", st))
    story.append(p("공헌 입력은 공헌자가 실제 기여 내용을 등록하는 화면입니다. 추천인을 지정하면 추천 의견 제출 후 승인 단계로 이동합니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "공헌 제목을 255자 이내로 입력합니다.",
                "공헌 유형, 활동일, 관련 부서, Effort Tier를 선택합니다.",
                "공헌 내용에는 수행 배경, 실제 기여, 협업 부서, 결과를 구체적으로 작성합니다.",
                "추천이 필요한 경우 동료추천인 목록에서 추천인을 선택하고 추가합니다.",
                "오른쪽 산정 미리보기에서 예상 Credit과 Tier 정보를 확인한 뒤 제출합니다.",
            ],
            st,
        )
    )
    story.append(
        note(
            "활동일 기준 30일 이내 입력 건은 추천 및 승인 대상으로 이동합니다. 30일을 초과한 입력 건은 unbillable로 분류됩니다.",
            st,
        )
    )
    story.append(image_block("03-contribution-input-filled.png", "공헌 입력: 제목, 유형, 활동일, 관련 부서, Tier, 공헌 내용, 추천인을 입력합니다.", st))

    story.append(PageBreak())
    story.extend(section_title("공헌 내역", st))
    story.append(p("공헌 내역은 본인이 입력한 공헌과 추천자로 지정된 의견 입력 대상을 확인하는 화면입니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "누적 승인 Credit, 입력 공헌 수, 추천 요청 수를 확인합니다.",
                "검색어와 기간 필터로 공헌 목록을 좁힙니다.",
                "목록에서 공헌 제목, 유형, 관련 부서, 상태, Credit을 확인합니다.",
                "추천 의견 입력 영역에 대기 항목이 있으면 추천 의견을 작성합니다.",
                "비공개 의견은 승인자와 위원회 검토 자료로만 사용됩니다.",
            ],
            st,
        )
    )
    story.append(image_block("04-my-contributions.png", "공헌 내역: 본인의 입력 공헌과 추천 의견 입력 대기 여부를 확인합니다.", st))
    story.append(p("상태 흐름", st["h2"]))
    story.append(
        table(
            [
                ["상태", "의미"],
                ["추천 대기", "추천인이 의견을 입력해야 하는 단계"],
                ["승인 대기", "승인권자가 점수와 Credit을 검토하는 단계"],
                ["승인", "Credit이 확정되어 내역에 반영된 상태"],
                ["반려", "공헌 인정 대상이 아니거나 보완이 필요한 상태"],
                ["입력기한 초과", "활동일 기준 30일을 초과해 일반 승인 대상에서 제외된 상태"],
            ],
            st,
            [42 * mm, CONTENT_WIDTH - 42 * mm],
        )
    )

    story.append(PageBreak())
    story.extend(section_title("승인 처리", st))
    story.append(p("승인 처리는 승인권자가 관련 부서의 승인 대기 공헌을 검토하고 최종 Credit을 확정하는 화면입니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "승인 처리 메뉴에서 처리 가능한 공헌을 확인합니다.",
                "공헌 내용과 추천 및 비공개 의견을 검토합니다.",
                "참여, 성과, 효과 체크 여부를 확인하고 필요하면 조정합니다.",
                "최종 Tier를 선택해 오른쪽 승인 산정 Credit을 확인합니다.",
                "승인/반려 의견을 입력한 뒤 승인 또는 반려를 선택합니다.",
                "제출 전 확인 창에서 한 번 더 결정 내용을 확인합니다.",
            ],
            st,
        )
    )
    story.append(image_block("05-approval-workbench.png", "승인 처리: 추천 의견을 확인하고 점수와 최종 Tier를 조정해 승인 Credit을 산정합니다.", st))

    story.append(PageBreak())
    story.extend(section_title("승인자 조회", st))
    story.append(p("승인자 조회는 승인권자가 자신의 승인 처리 현황과 대기 건수를 확인하는 화면입니다. 관리자는 전체 범위 기준으로 확인할 수 있습니다.", st["body"]))
    story.append(
        bullet_list(
            [
                "승인율은 승인/반려 결정 기준으로 계산됩니다.",
                "발행 Credit은 승인 결정으로 누적 발행된 Credit입니다.",
                "참고 사항에서 현재 승인 대기 건수와 점검 메시지를 확인합니다.",
                "승인 내역 표에서 처리한 건의 상태와 Credit을 확인합니다.",
                "승인 내역 항목을 펼치면 공헌 내용을 함께 확인할 수 있습니다.",
            ],
            st,
        )
    )
    story.append(image_block("06-approver-insights.png", "승인자 조회: 승인율, 발행 Credit, 반려 건수, 승인 내역을 확인합니다.", st))

    story.append(PageBreak())
    story.extend(section_title("위원회 심의", st))
    story.append(
        note(
            "<b>추후 개발</b><br/>위원회 심의 기능은 아직 운영 기능으로 확정 구현되지 않았습니다. 현재 매뉴얼에서는 대메뉴 위치와 개발 예정 상태만 표시합니다.",
            st,
            tone="orange",
        )
    )
    story.append(
        table(
            [
                ["항목", "표시 내용"],
                ["대메뉴", "위원회 심의"],
                ["상태", "추후 개발"],
                ["예정 범위", "이상 사례, 비공개 의견, 표본감사, 이의신청 검토"],
            ],
            st,
            [42 * mm, CONTENT_WIDTH - 42 * mm],
        )
    )

    story.append(PageBreak())
    story.extend(section_title("관리자", st))
    story.append(
        note(
            "<b>추후 개발</b><br/>관리자 기능은 아직 운영 기능으로 확정 구현되지 않았습니다. 현재 매뉴얼에서는 대메뉴 위치와 개발 예정 상태만 표시합니다.",
            st,
            tone="orange",
        )
    )
    story.append(
        table(
            [
                ["항목", "표시 내용"],
                ["대메뉴", "관리자"],
                ["상태", "추후 개발"],
                ["예정 범위", "사용자 및 권한, 조직, 승인권자, 예산 풀, 심의 임계값 관리"],
            ],
            st,
            [42 * mm, CONTENT_WIDTH - 42 * mm],
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        rightMargin=MARGIN_X,
        leftMargin=MARGIN_X,
        topMargin=MARGIN_Y,
        bottomMargin=MARGIN_Y,
        title="TCredit 사이트 이용 매뉴얼",
        author="TCredit",
    )
    doc.build(story)


if __name__ == "__main__":
    build_menu_chapter_version()
