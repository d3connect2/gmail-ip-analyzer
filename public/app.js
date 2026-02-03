/**
 * Gmail IP Analyzer - Frontend
 */

(function () {
  const form = document.getElementById('analyze-form');
  const submitBtn = document.getElementById('submit-btn');
  const formStatus = document.getElementById('form-status');
  const resultsSection = document.getElementById('results-section');
  const resultsSummary = document.getElementById('results-summary');
  const resultsList = document.getElementById('results-list');

  const apiBase = window.location.origin;

  function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.className = 'status ' + (type || 'info');
    formStatus.hidden = false;
  }

  function clearStatus() {
    formStatus.hidden = true;
    formStatus.textContent = '';
    formStatus.className = 'status';
  }

  function renderIpInfo(ipInfo) {
    if (!ipInfo) return '';
    if (ipInfo.status !== 'success') {
      return '<p class="ip-fail">' + (ipInfo.message || 'Lookup failed') + '</p>';
    }
    const parts = [];
    if (ipInfo.country) parts.push({ label: 'Country', value: ipInfo.country + (ipInfo.countryCode ? ' (' + ipInfo.countryCode + ')' : '') });
    if (ipInfo.regionName) parts.push({ label: 'Region', value: ipInfo.regionName });
    if (ipInfo.city) parts.push({ label: 'City', value: ipInfo.city });
    if (ipInfo.zip) parts.push({ label: 'Zip', value: ipInfo.zip });
    if (ipInfo.lat != null && ipInfo.lon != null) parts.push({ label: 'Lat/Lon', value: ipInfo.lat + ', ' + ipInfo.lon });
    if (ipInfo.isp) parts.push({ label: 'ISP', value: ipInfo.isp });
    if (ipInfo.org) parts.push({ label: 'Org', value: ipInfo.org });
    if (ipInfo.as) parts.push({ label: 'AS', value: ipInfo.as });
    if (parts.length === 0) return '<p class="ip-fail">No details</p>';
    return '<div class="ip-info">' + parts.map(function (p) {
      return '<span class="item"><strong>' + escapeHtml(p.label) + ':</strong> ' + escapeHtml(String(p.value)) + '</span>';
    }).join('') + '</div>';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderEmail(entry) {
    const ip = entry.senderIp;
    const ipInfoHtml = renderIpInfo(entry.ipInfo);
    return (
      '<div class="email-block">' +
        '<div class="email-meta">' +
          '<div class="subject">' + escapeHtml(entry.subject) + '</div>' +
          '<div class="from">' + escapeHtml(entry.from) + '</div>' +
          '<div class="date">' + escapeHtml(entry.date) + '</div>' +
        '</div>' +
        (ip
          ? '<div class="ip-block">' +
              '<div class="ip-address">Sender IP: ' + escapeHtml(ip) + '</div>' +
              ipInfoHtml +
            '</div>'
          : '<div class="ip-block"><p class="ip-fail">No sender IP found in Received headers</p></div>') +
      '</div>'
    );
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearStatus();
    submitBtn.disabled = true;
    setStatus('Connecting and analyzing…', 'info');

    const email = document.getElementById('email').value.trim();
    const appPassword = document.getElementById('appPassword').value.trim();
    const maxEmails = parseInt(document.getElementById('maxEmails').value, 10) || 20;

    try {
      const res = await fetch(apiBase + '/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, appPassword, maxEmails }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(data.detail || data.error || 'Request failed', 'error');
        return;
      }

      setStatus(data.message || 'Done.', 'success');
      resultsSummary.textContent = data.emails && data.emails.length
        ? 'Processed ' + data.emails.length + ' email(s) from Spam. All have been marked as read.'
        : 'No unread emails in Spam.';
      resultsList.innerHTML = (data.emails || []).map(renderEmail).join('');
      resultsSection.hidden = false;
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      setStatus('Network error: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
