BOOKING_SUMMARY_HTML = """\
<!DOCTYPE html>
<html><body>
<p>Hi {fn} {ln} 👋,</p>
<p>A new mock interview has been scheduled.</p>
</b>
<table cellspacing="0" cellpadding="10" border="0" style="border-collapse:collapse;max-width:560px;border:1px solid #ddd;">
  <tbody>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;width:38%;">Selected time (ISO)</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{safe_when}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Email</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{safe_to}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Interview soon</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{has_iv}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Company</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{co_display}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Experience</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{exp_display}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Question type</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{qtype_display}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Notes</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{notes_display}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top;">Referral</td>
      <td style="border:1px solid #ddd;vertical-align:top;">{referral_display}</td>
    </tr>
  </tbody>
</table>
</body></html>"""
