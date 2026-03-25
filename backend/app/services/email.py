import logging
import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_verification_email(email: str, token: str) -> None:
    """Send email verification link to the user."""
    verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={token}"

    subject = "Verifica tu correo electrónico - MHAT"
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #064e3b; font-size: 28px; margin: 0;">MHAT</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Historial Médico</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
            <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Verifica tu correo electrónico</h2>
            <p style="color: #4b5563; line-height: 1.6;">
                ¡Gracias por registrarte! Para completar tu registro, haz clic en el siguiente botón
                para verificar tu dirección de correo electrónico.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{verification_url}"
                   style="background-color: #064e3b; color: #ffffff; padding: 14px 32px;
                          text-decoration: none; border-radius: 8px; font-weight: 600;
                          display: inline-block; font-size: 16px;">
                    Verificar Correo
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                Si no creaste una cuenta en MHAT, puedes ignorar este correo.
                Este enlace expira en {settings.EMAIL_VERIFY_TOKEN_EXPIRE_HOURS} horas.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <a href="{verification_url}" style="color: #064e3b; word-break: break-all;">{verification_url}</a>
            </p>
        </div>
    </div>
    """

    await _send_email(email, subject, html_body)


async def send_password_reset_email(email: str, token: str) -> None:
    """Send password reset link to the user."""
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"

    subject = "Restablecer contraseña - MHAT"
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #064e3b; font-size: 28px; margin: 0;">MHAT</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Historial Médico</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
            <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Restablecer contraseña</h2>
            <p style="color: #4b5563; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Haz clic en el siguiente botón para crear una nueva contraseña.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_url}"
                   style="background-color: #064e3b; color: #ffffff; padding: 14px 32px;
                          text-decoration: none; border-radius: 8px; font-weight: 600;
                          display: inline-block; font-size: 16px;">
                    Restablecer Contraseña
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
                Tu contraseña actual no cambiará.
                Este enlace expira en {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hora(s).
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <a href="{reset_url}" style="color: #064e3b; word-break: break-all;">{reset_url}</a>
            </p>
        </div>
    </div>
    """

    await _send_email(email, subject, html_body)


async def send_patient_activation_email(email: str, doctor_name: str) -> None:
    """Send activation email to patient when a doctor creates their profile."""
    register_url = f"{settings.FRONTEND_URL}/auth/register"

    subject = "Tu médico creó tu perfil de salud - MHAT"
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #064e3b; font-size: 28px; margin: 0;">MHAT</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Historial Médico</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
            <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Tu perfil de salud está listo</h2>
            <p style="color: #4b5563; line-height: 1.6;">
                <strong>{doctor_name}</strong> ha creado un perfil de salud para ti en MHAT.
                Para acceder a tu historial médico y gestionar tu información de salud,
                crea tu cuenta haciendo clic en el siguiente botón.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{register_url}"
                   style="background-color: #064e3b; color: #ffffff; padding: 14px 32px;
                          text-decoration: none; border-radius: 8px; font-weight: 600;
                          display: inline-block; font-size: 16px;">
                    Crear Mi Cuenta
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                Si no reconoces al médico mencionado, puedes ignorar este correo.
                No se creará ninguna cuenta sin tu consentimiento.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <a href="{register_url}" style="color: #064e3b; word-break: break-all;">{register_url}</a>
            </p>
        </div>
    </div>
    """

    await _send_email(email, subject, html_body)


async def _send_email(to: str, subject: str, html: str) -> None:
    """Send an email via Resend or log to console in dev mode."""
    if not settings.EMAIL_ENABLED:
        # Use print() so it's always visible in Docker compose logs
        import re
        # Extract all links from the HTML for easy copy-paste
        links = re.findall(r'href="([^"]+)"', html)
        # Deduplicate while preserving order
        seen: set[str] = set()
        unique_links = [x for x in links if not (x in seen or seen.add(x))]
        link_str = "\n".join(f"  → {link}" for link in unique_links) if unique_links else "  (no links found)"
        print(
            "\n" + "=" * 60 +
            f"\n📧 EMAIL (dev mode - not sent)"
            f"\nTo: {to}"
            f"\nSubject: {subject}"
            f"\n\n🔗 Links:"
            f"\n{link_str}"
            "\n" + "=" * 60
        )
        return

    if not settings.RESEND_API_KEY:
        logger.error("EMAIL_ENABLED is True but RESEND_API_KEY is not set")
        return

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
