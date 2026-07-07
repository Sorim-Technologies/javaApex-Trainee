"""
Email Service - Send migration summary emails
"""
import os
from typing import Any, Optional
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from jinja2 import Template


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.email_from = os.getenv("SMTP_FROM_EMAIL") or os.getenv("EMAIL_FROM", "migration-bot@example.com")
        self.email_from_name = os.getenv("SMTP_FROM_NAME", "javaAPEX Migration Bot")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}

    def _configured(self) -> bool:
        return bool(
            self.smtp_host
            and self.smtp_port
            and self.smtp_user
            and self.smtp_password
            and self.email_from
            and self.smtp_password not in {"your_app_password", "your_app_password_here"}
        )

    async def _send_message(self, message: MIMEMultipart) -> None:
        await aiosmtplib.send(
            message,
            hostname=self.smtp_host,
            port=self.smtp_port,
            username=self.smtp_user,
            password=self.smtp_password,
            start_tls=self.smtp_use_tls,
        )
    
    async def send_migration_summary(self, to_email: str, job: Any) -> bool:
        """Send migration summary email"""
        try:
            print(f"[EMAIL] Attempting to send email to: {to_email}")
            print(f"[EMAIL] SMTP Config - Host: {self.smtp_host}, Port: {self.smtp_port}, User: {self.smtp_user}, Password: {'***' if self.smtp_password else 'NOT SET'}")

            # Generate email content
            subject = f"Migration Complete: {job.source_repo} → Java {job.target_java_version}"
            html_content = self._generate_email_html(job)
            text_content = self._generate_email_text(job)

            print(f"[EMAIL] Generated email - Subject: {subject}")

            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = formataddr((self.email_from_name, self.email_from))
            message["To"] = to_email
            message["Subject"] = subject

            message.attach(MIMEText(text_content, "plain"))
            message.attach(MIMEText(html_content, "html"))

            # Send email
            if self._configured():
                print(f"[EMAIL] Sending email via SMTP...")
                await self._send_message(message)
                print(f"[EMAIL] Email sent successfully to {to_email}")
                return True
            else:
                # Log email content for development
                print(f"[EMAIL] SMTP credentials not properly configured, logging email content instead")
                print(f"[EMAIL] Would send to {to_email}:")
                print(f"Subject: {subject}")
                print(f"Content length: {len(text_content)} chars")
                return False  # Return False so we know it didn't actually send

        except Exception as e:
            print(f"[EMAIL] Error sending email: {e}")
            import traceback
            print(f"[EMAIL] Traceback: {traceback.format_exc()}")
            return False

    async def send_migration_report(self, to_email: str, migration: Any, user_name: Optional[str] = None) -> bool:
        """Send a completed migration report email from a migration_history row."""
        try:
            repository_name = migration.repository_name or migration.repository_url or "repository"
            subject = f"javaAPEX migration completed: {repository_name}"
            html_content = self._generate_migration_report_html(migration, user_name)
            text_content = self._generate_migration_report_text(migration, user_name)

            message = MIMEMultipart("alternative")
            message["From"] = formataddr((self.email_from_name, self.email_from))
            message["To"] = to_email
            message["Subject"] = subject
            message.attach(MIMEText(text_content, "plain"))
            message.attach(MIMEText(html_content, "html"))

            if not self._configured():
                print("[EMAIL] SMTP credentials not configured; migration report email was not sent")
                return False

            await self._send_message(message)
            print(f"[EMAIL] Migration report sent to {to_email} for migration id={migration.id}")
            return True
        except Exception as e:
            print(f"[EMAIL] Error sending migration report: {e}")
            import traceback
            print(f"[EMAIL] Traceback: {traceback.format_exc()}")
            return False

    def _duration_text(self, migration: Any) -> str:
        started_at = getattr(migration, "started_at", None)
        completed_at = getattr(migration, "completed_at", None)
        if not started_at or not completed_at:
            return "Not available"
        total_seconds = max(0, int(round((completed_at - started_at).total_seconds())))
        minutes, seconds = divmod(total_seconds, 60)
        hours, minutes = divmod(minutes, 60)
        parts = []
        if hours:
            parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
        if minutes:
            parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
        if seconds or not parts:
            parts.append(f"{seconds} second{'s' if seconds != 1 else ''}")
        return " ".join(parts)

    def _generate_migration_report_html(self, migration: Any, user_name: Optional[str] = None) -> str:
        template = Template("""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <h2 style="color: #1d4ed8;">javaAPEX Migration Completed</h2>
  <p>Hello {{ user_name or 'there' }},</p>
  <p>Your migration for <strong>{{ repository_name }}</strong> completed successfully.</p>
  <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
    <tr><th style="text-align:left;border:1px solid #e2e8f0;padding:8px;background:#eff6ff;">Field</th><th style="text-align:left;border:1px solid #e2e8f0;padding:8px;background:#eff6ff;">Value</th></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Repository</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ repository_name }}</td></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Source Java</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ source_java }}</td></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Target Java</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ target_java }}</td></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Status</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ status }}</td></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Duration</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ duration }}</td></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Completed At</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ completed_at }}</td></tr>
    <tr><td style="border:1px solid #e2e8f0;padding:8px;">Migrated Repository</td><td style="border:1px solid #e2e8f0;padding:8px;">{{ migrated_repo_url }}</td></tr>
  </table>
  <p style="color:#64748b;font-size:12px;">Generated by javaAPEX Migration Bot.</p>
</body>
</html>
        """)
        return template.render(**self._migration_report_context(migration, user_name))

    def _generate_migration_report_text(self, migration: Any, user_name: Optional[str] = None) -> str:
        context = self._migration_report_context(migration, user_name)
        return f"""javaAPEX Migration Completed

Hello {context['user_name'] or 'there'},

Your migration for {context['repository_name']} completed successfully.

Repository: {context['repository_name']}
Source Java: {context['source_java']}
Target Java: {context['target_java']}
Status: {context['status']}
Duration: {context['duration']}
Completed At: {context['completed_at']}
Migrated Repository: {context['migrated_repo_url']}

Generated by javaAPEX Migration Bot.
"""

    def _migration_report_context(self, migration: Any, user_name: Optional[str]) -> dict:
        return {
            "user_name": user_name,
            "repository_name": migration.repository_name or migration.repository_url or "Unknown repository",
            "source_java": migration.source_java_version or "-",
            "target_java": migration.target_java_version or "-",
            "status": migration.status,
            "duration": self._duration_text(migration),
            "completed_at": migration.completed_at.isoformat() if migration.completed_at else "-",
            "migrated_repo_url": migration.migrated_repo_url or "-",
        }
    
    def _generate_email_html(self, job: Any) -> str:
        """Generate HTML email content"""
        template = Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .section { margin-bottom: 20px; }
        .section h3 { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .stat { display: inline-block; margin: 10px 20px 10px 0; }
        .stat-value { font-size: 24px; font-weight: bold; color: #28a745; }
        .stat-label { font-size: 12px; color: #666; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .badge-success { background: #28a745; color: white; }
        .badge-warning { background: #ffc107; color: black; }
        .badge-danger { background: #dc3545; color: white; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Migration Complete!</h1>
            <p>Java {{ source_version }} → Java {{ target_version }}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h3>📊 Migration Summary</h3>
                <div class="stat">
                    <div class="stat-value">{{ files_modified }}</div>
                    <div class="stat-label">Files Modified</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{ issues_fixed }}</div>
                    <div class="stat-label">Issues Fixed</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{ api_working }}/{{ api_total }}</div>
                    <div class="stat-label">APIs Working</div>
                </div>
            </div>
            
            <div class="section">
                <h3>🔍 Code Quality (SonarQube)</h3>
                <p>Quality Gate: <span class="badge badge-success">{{ quality_gate }}</span></p>
                <table>
                    <tr><th>Metric</th><th>Value</th></tr>
                    <tr><td>Bugs</td><td>{{ bugs }}</td></tr>
                    <tr><td>Vulnerabilities</td><td>{{ vulnerabilities }}</td></tr>
                    <tr><td>Code Smells</td><td>{{ code_smells }}</td></tr>
                    <tr><td>Coverage</td><td>{{ coverage }}%</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h3>🔗 Repository Links</h3>
                <p><strong>Source:</strong> <a href="{{ source_repo }}">{{ source_repo }}</a></p>
                <p><strong>Migrated:</strong> <a href="{{ target_repo }}">{{ target_repo }}</a></p>
            </div>
            
            <div class="section">
                <h3>📦 Dependencies Updated</h3>
                <table>
                    <tr><th>Artifact</th><th>Old Version</th><th>New Version</th><th>Status</th></tr>
                    {% for dep in dependencies %}
                    <tr>
                        <td>{{ dep.artifact_id }}</td>
                        <td>{{ dep.current_version }}</td>
                        <td>{{ dep.new_version or 'N/A' }}</td>
                        <td><span class="badge badge-{{ 'success' if dep.status == 'upgraded' else 'warning' }}">{{ dep.status }}</span></td>
                    </tr>
                    {% endfor %}
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by Javtion) tara Migration Accelerator</p>
            <p>{{ timestamp }}</p>
        </div>
    </div>
</body>
</html>
        """)
        
        return template.render(
            source_version=job.source_java_version,
            target_version=job.target_java_version,
            files_modified=job.files_modified,
            issues_fixed=job.issues_fixed,
            api_working=job.api_endpoints_working,
            api_total=job.api_endpoints_validated,
            quality_gate=job.sonar_quality_gate or "N/A",
            bugs=job.sonar_bugs,
            vulnerabilities=job.sonar_vulnerabilities,
            code_smells=job.sonar_code_smells,
            coverage=job.sonar_coverage,
            source_repo=job.source_repo,
            target_repo=job.target_repo or "Pending",
            dependencies=job.dependencies[:10] if job.dependencies else [],
            timestamp=job.completed_at.isoformat() if job.completed_at else "In Progress"
        )
    
    def _generate_email_text(self, job: Any) -> str:
        """Generate plain text email content"""
        return f"""
Java Migration Complete!
========================

Migration: Java {job.source_java_version} → Java {job.target_java_version}

Summary:
- Files Modified: {job.files_modified}
- Issues Fixed: {job.issues_fixed}
- APIs Working: {job.api_endpoints_working}/{job.api_endpoints_validated}

Code Quality (SonarQube):
- Quality Gate: {job.sonar_quality_gate or 'N/A'}
- Bugs: {job.sonar_bugs}
- Vulnerabilities: {job.sonar_vulnerabilities}
- Code Smells: {job.sonar_code_smells}
- Coverage: {job.sonar_coverage}%

Repository Links:
- Source: {job.source_repo}
- Migrated: {job.target_repo or 'Pending'}

---
Generated by Java Migration Accelerator
        """
