// Admin disputes list and actions
async function loadDisputes() {
  try {
    const tbody = document.querySelector('#disputesTable tbody');
    const noEl = document.getElementById('noDisputes');
    tbody.innerHTML = '';

    const disputes = await apiRequest('/disputes');
    if (!disputes || disputes.length === 0) {
      noEl.style.display = 'block';
      return;
    }
    noEl.style.display = 'none';

    disputes.forEach((d, idx) => {
      // skip disputes that reference missing milestones
      if (!d.milestone) return;
      const row = document.createElement('tr');
      const milestoneObj = d.milestone || {};
      const contractObj = d.contract || (milestoneObj.contract || {});
      const milestoneTitle = milestoneObj.title || (milestoneObj._id || '');
      const contractTitle = contractObj.title || (contractObj._id || '');
      const amount = milestoneObj.amount != null ? milestoneObj.amount : '';

      const clientId = contractObj.client ? (contractObj.client._id || contractObj.client) : '';
      const freelancerId = contractObj.freelancer ? (contractObj.freelancer._id || contractObj.freelancer) : '';

      const actionHtml = (d.status === 'RESOLVED') ? `<span class="resolved-label">${escapeHtml(d.resolution || 'RESOLVED')}</span>` : `
          <button class="action-split" data-id="${d._id}">Split</button>
          <button class="action-refund" data-id="${d._id}">Refund</button>
          <button class="action-release" data-id="${d._id}">Release</button>
        `;

      row.innerHTML = `
        <td>${idx+1}</td>
        <td>${escapeHtml(milestoneTitle)}<br><small>${milestoneObj._id || ''}</small></td>
        <td>${escapeHtml(contractTitle)}<br><small>${contractObj._id || ''}</small></td>
        <td>${amount}</td>
        <td><small>${escapeHtml(clientId || '')}</small></td>
        <td><small>${escapeHtml(freelancerId || '')}</small></td>
        <td>${escapeHtml(d.reason || '')}</td>
        <td>${milestoneObj ? escapeHtml(milestoneObj.status || '') : ''}</td>
        <td>${actionHtml}</td>
      `;

      tbody.appendChild(row);

      // attach per-row handlers to avoid scoping/initialization issues
      const splitBtn = row.querySelector('.action-split');
      if (splitBtn) splitBtn.addEventListener('click', async () => {
        const id = splitBtn.dataset.id;
        if (!await showConfirm('Perform SPLIT action?')) return;
        await resolveDisputeAction(id, 'SPLIT');
      });

      const refundBtn = row.querySelector('.action-refund');
      if (refundBtn) refundBtn.addEventListener('click', async () => {
        const id = refundBtn.dataset.id;
        if (!await showConfirm('Perform REFUND action?')) return;
        await resolveDisputeAction(id, 'REFUND');
      });

      const releaseBtn = row.querySelector('.action-release');
      if (releaseBtn) releaseBtn.addEventListener('click', async () => {
        const id = releaseBtn.dataset.id;
        if (!await showConfirm('Perform RELEASE action?')) return;
        await resolveDisputeAction(id, 'RELEASE');
      });

    });

  } catch (err) {
    console.error(err);
    const container = document.getElementById('disputesContainer');
    if (container) container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
}

async function resolveDisputeAction(id, action) {
  try {
    await apiRequest(`/disputes/resolve/${id}`, 'PUT', { action });
    showToast('Action performed', 'success');
    loadDisputes(); // refresh list to show updated status
  } catch (err) {
    showToast(err.message || 'Failed to perform action', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const role = localStorage.getItem('userRole');
  // show nav Disputes link only for admin
  const nav = document.getElementById('navDisputes');
  if (nav && role === 'admin') nav.style.display = '';
  if (role !== 'admin') {
    document.body.innerHTML = '<p style="padding:20px">Access denied</p>';
    return;
  }
  await loadDisputes();
});
