from fastapi.responses import StreamingResponse, PlainTextResponse
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
import re, os, tempfile, subprocess
import pandas as pd

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "../PlantillaOrden.docx")

# ---------- Utilidades DOCX ----------
def rebuild_docx(original_bytes: bytes, updated_xml: bytes, path="word/document.xml") -> bytes:
    in_buf = BytesIO(original_bytes)
    out_buf = BytesIO()
    with ZipFile(in_buf, "r") as zin, ZipFile(out_buf, "w", compression=ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == path:
                data = updated_xml
            zout.writestr(item, data)
    return out_buf.getvalue()

def tolerant_replace(xml: str, mapping: dict) -> str:
    for k, v in mapping.items():
        k_xml = k.replace("&", "&amp;")
        xml = xml.replace(k_xml, v)

    def make_crossrun_pattern(token_key: str):
        core = token_key.strip("&")
        return re.compile(
            rf"&amp;\s*</w:t>\s*(?:</w:r>\s*<w:r[^>]*>\s*(?:<w:rPr>.*?</w:rPr>\s*)?)?<w:t[^>]*>\s*{re.escape(core)}\s*&amp;",
            re.DOTALL | re.IGNORECASE
        )
    for k, v in mapping.items():
        xml = re.sub(make_crossrun_pattern(k), v, xml)

    def make_trailing_amp_pattern(token_key: str):
        core = token_key.strip("&")
        return re.compile(
            rf"&amp;{re.escape(core)}\s*</w:t>\s*(?:</w:r>\s*<w:r[^>]*>\s*(?:<w:rPr>.*?</w:rPr>\s*)?)?<w:t[^>]*>\s*&amp;",
            re.DOTALL | re.IGNORECASE
        )
    for k, v in mapping.items():
        xml = re.sub(make_trailing_amp_pattern(k), v, xml)

    return xml

def fill_docx_with_mapping(template_bytes: bytes, mapping: dict) -> bytes:
    with ZipFile(BytesIO(template_bytes), "r") as z:
        xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
    xml_new = tolerant_replace(xml, mapping)
    return rebuild_docx(template_bytes, xml_new.encode("utf-8"))

def docx_to_pdf_bytes(docx_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as td:
        in_path = os.path.join(td, "tmp.docx")
        out_dir = td
        with open(in_path, "wb") as f:
            f.write(docx_bytes)

        cmd = [
            "soffice", "--headless", "--nologo", "--nolockcheck",
            "--convert-to", "pdf", "--outdir", out_dir, in_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        pdf_path = os.path.join(out_dir, "tmp.pdf")
        with open(pdf_path, "rb") as f:
            return f.read()

def generate_pdf_from_template(mapping: dict) -> bytes:
    if not os.path.exists(TEMPLATE_PATH):
        raise FileNotFoundError(f"No se encontró la plantilla en {TEMPLATE_PATH}")
    with open(TEMPLATE_PATH, "rb") as f:
        tpl_bytes = f.read()
    filled_docx = fill_docx_with_mapping(tpl_bytes, mapping)
    return docx_to_pdf_bytes(filled_docx)

# ---------- Normalización desde Excel ----------
WANTED_KEYS = [
    "&NOMBRE&", "&FECHA&", "&DIR_SALIDA&", "&DIR_DESTINO&", "&HOR_IDA&",
    "&HOR_REGRESO&", "&DURACION&", "&CAPACIDADU&", "&TOTAL&",
    "&DESCUENTO&", "&ABONADO&", "&FECHA_ABONO&", "&LIQUIDAR&"
]

def build_mapping_from_row(row: dict) -> dict:
    norm = {str(k).strip().lower().replace(" ", "").replace("&", ""): str(v) if v is not None else "" for k, v in row.items()}
    mapping = {}
    for token in WANTED_KEYS:
        core = token.strip("&").lower().replace(" ", "")
        candidates = [
            core,
            core.replace("_",""),
            core.replace("dirsalida", "dir_salida").replace("dirdestino","dir_destino"),
        ]
        value = ""
        for c in candidates:
            if c in norm:
                value = norm[c]
                break
        mapping[token] = value
    return mapping

def read_first_row_from_excel(file_bytes: bytes, sheet_name: str | None = None) -> dict:
    with BytesIO(file_bytes) as bio:
        df = pd.read_excel(bio, sheet_name=sheet_name)
    if df.empty:
        raise ValueError("El Excel no tiene filas.")
    first = df.iloc[0].to_dict()
    return first