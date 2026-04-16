import smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

from config import get_settings

_FROM = "fe.malveira.87@gmail.com"

_PRIORIDADE_LABEL = {
    "urgent": "Urgente",
    "high": "Alta",
    "medium": "Média",
    "low": "Baixa",
}


def _prioridade_exibicao(prioridade: str) -> str:
    return _PRIORIDADE_LABEL.get(prioridade, prioridade)


def _descricao_html(texto: str) -> str:
    esc = escape(texto)
    return esc.replace("\n", "<br>\n")


def send_ticket_notification(
    *,
    tipo: str,
    titulo: str,
    prioridade: str,
    modulo_afetado: str,
    descricao_tecnica: str,
    cursor_prompt: str,
    link: str | None,
) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        raise ValueError("SMTP_HOST não configurado.")
    if not settings.smtp_user or not settings.smtp_pass:
        raise ValueError("SMTP_USER e SMTP_PASS não configurados.")

    to_addr = settings.email_to
    if not to_addr:
        raise ValueError("EMAIL_TO não configurado.")

    subject = f"[Novo Ticket] {tipo} - {titulo}"

    link_html: str
    if link:
        link_html = f'<a href="{escape(link, quote=True)}">{escape(link)}</a>'
    else:
        link_html = "<em>Não disponível</em>"

    body_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a;">
  <h2 style="margin-top: 0;">Novo ticket</h2>
  <table style="border-collapse: collapse; max-width: 640px;">
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; vertical-align: top;">Tipo</td>
        <td style="padding: 6px 0;">{escape(tipo)}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; vertical-align: top;">Título</td>
        <td style="padding: 6px 0;">{escape(titulo)}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; vertical-align: top;">Prioridade</td>
        <td style="padding: 6px 0;">{escape(_prioridade_exibicao(prioridade))}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; vertical-align: top;">Módulo afetado</td>
        <td style="padding: 6px 0;">{escape(modulo_afetado)}</td></tr>
  </table>
  <h3 style="margin-bottom: 0.5rem;">Descrição técnica</h3>
  <div style="margin-bottom: 1.25rem; padding: 12px; background: #f5f5f5; border-radius: 8px;">
    {_descricao_html(descricao_tecnica)}
  </div>
  <h3 style="margin-bottom: 0.5rem;">Prompt para Cursor (IA)</h3>
  <div style="margin-bottom: 1.25rem; padding: 12px; background: #f5f5f5; border-radius: 8px;">
    {_descricao_html(cursor_prompt)}
  </div>
  <p style="margin: 0;"><strong>Link</strong></p>
  <p style="margin: 0.25rem 0 0 0;">{link_html}</p>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = str(Header(subject, "utf-8"))
    msg["From"] = _FROM
    msg["To"] = to_addr
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_pass)
        server.sendmail(_FROM, [to_addr], msg.as_string())
