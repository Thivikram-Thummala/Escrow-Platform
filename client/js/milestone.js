async function createMilestone() {
  // kept for compatibility if called directly; prefer inline flow on milestones page
  const contractIdEl = document.getElementById("contractId");
  if (!contractIdEl) return;
  const contractId = contractIdEl.value;
  const title = document.getElementById("milestoneTitle").value;
  const amount = document.getElementById("milestoneAmount").value;

  try {
    await apiRequest(`/milestones/${contractId}`, "POST", { title, amount });
    showToast("Milestone created", 'success');
  } catch (err) {
    showToast(err.message || 'Failed to create milestone', 'error');
  }
}
// Load and render milestones relevant to logged-in user
async function loadMilestones() {
  try {
    const tbody = document.querySelector('#milestonesTable tbody');
    const noEl = document.getElementById('noMilestones');
    tbody.innerHTML = '';

    const milestones = await apiRequest('/milestones');
    if (!milestones || milestones.length === 0) {
      noEl.style.display = 'block';
      return;
    }

    noEl.style.display = 'none';

    const currentRole = localStorage.getItem('userRole');

    milestones.forEach(ms => {
      const contractTitle = (ms.contract && ms.contract.title) ? ms.contract.title : 'Contract';

      // main data row
      const row = document.createElement('tr');
      row.className = 'ms-row';
      row.dataset.id = ms._id;

      const dateText = ms.createdAt ? new Date(ms.createdAt).toLocaleDateString() : '';

      // Raise Disputes button (freelancer) and client dispute display
      let actionsHtml = '';
      if (currentRole === 'client' && ms.status === 'SUBMITTED') {
        actionsHtml = `
            <button class="row-approve" data-id="${ms._id}">Accept</button>
            <button class="row-reject" data-id="${ms._id}">Reject</button>`;
      } else if (currentRole === 'freelancer') {
        if (ms.status === 'PENDING') {
          // freelancer should mark submitted; hide raise dispute for pending
          actionsHtml = `<button class="row-submit" data-id="${ms._id}">Mark Submitted</button>`;
        } else if (ms.dispute && ms.dispute._id && ms.status === 'DISPUTED') {
          actionsHtml = `<button class="raise-dispute" data-id="${ms._id}" data-dispute-id="${ms.dispute._id}">Edit Dispute</button>`;
        } else if (ms.status === 'REJECTED') {
          actionsHtml = `<button class="raise-dispute" data-id="${ms._id}">Raise Dispute</button>`;
        }
      }

      const disputeText = ms.dispute && ms.dispute.reason ? escapeHtml(ms.dispute.reason) : 'No dispute';

      row.innerHTML = `
        <td title="${escapeHtml(ms.description || '')}">${escapeHtml(ms.title || '')}</td>
        <td>${escapeHtml(contractTitle)}</td>
        <td>${ms.amount != null ? '₹' + Number(ms.amount).toLocaleString('en-IN') : ''}</td>
        <td>${ms._id}</td>
        <td>${dateText}</td>
        <td>
          <span class="status status-${ms.status}">${ms.status}</span>
          ${ms.status === 'RESOLVED' ? `<div class="ms-resolution" 
            style="font-size:12px;text-align:center;margin-left:2px;margin-top:4px;color:#05963f">
            ${escapeHtml(ms.resolution || (ms.dispute && ms.dispute.resolution) || '')}</div>` : ''}
        </td>
        <td class="dispute-cell">${disputeText}</td>
        <td style="text-align:right">
          ${actionsHtml}
        </td>
      `;

      tbody.appendChild(row);

      // add a hidden panel row directly below main row for entering dispute reason (freelancer)
      const panelRow = document.createElement('tr');
      panelRow.className = 'dispute-panel-row';
      panelRow.style.display = 'none';
      panelRow.innerHTML = `<td colspan="8">
        <div class="dispute-panel">
          <textarea class="dispute-reason" rows="3" placeholder="Enter dispute reason"></textarea>
          <div style="margin-top:6px">
            <button class="dispute-submit">Submit Dispute</button>
            <button class="dispute-cancel">Cancel</button>
          </div>
        </div>
      </td>`;
      tbody.appendChild(panelRow);

      // prefill text area if dispute exists
      if (ms.dispute && ms.dispute.reason) {
        const ta = panelRow.querySelector('.dispute-reason');
        if (ta) ta.value = ms.dispute.reason;
      }

      // approve/reject buttons in-row
      const approveBtn = row.querySelector('.row-approve');
      const rejectBtn = row.querySelector('.row-reject');
      if (approveBtn || rejectBtn) {
        const setDisabledUI = (disabled) => {
          [approveBtn, rejectBtn].forEach(b => {  // b is button element
            if (!b) return;
            b.disabled = disabled;
            if (disabled) b.classList.add('disabled-action'); else b.classList.remove('disabled-action');
          });
        };

        if (approveBtn) approveBtn.addEventListener('click', async () => {
          setDisabledUI(true);
          try {
            await approveMilestone(ms._id);
          } catch (err) {
            setDisabledUI(false);
            showToast(err.message || 'Failed to approve', 'error');
          }
        });
        if (rejectBtn) rejectBtn.addEventListener('click', async () => {
          setDisabledUI(true);
          try {
            await rejectMilestone(ms._id);
          } catch (err) {
            setDisabledUI(false);
            showToast(err.message || 'Failed to reject', 'error');
          }
        });
      }

      // submit (freelancer marks as submitted) - attach handler regardless of approve/reject presence
      const submitBtn = row.querySelector('.row-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          submitBtn.disabled = true;
          try {
            await apiRequest(`/milestones/submit/${ms._id}`, 'PUT');
            showToast('Milestone marked submitted', 'success');
            // refresh list to reflect new actions/status
            loadMilestones();
          } catch (err) {
            submitBtn.disabled = false;
            showToast(err.message || 'Failed to submit', 'error');
          }
        });
      }

      // Raise dispute button: toggle panel and submit
      const disputeBtn = row.querySelector('.raise-dispute');
      if (disputeBtn) {
        const panel = panelRow;
        const textarea = panel.querySelector('.dispute-reason');
        const submitBtn = panel.querySelector('.dispute-submit');
        const cancelBtn = panel.querySelector('.dispute-cancel');

        const showPanel = () => { panel.style.display = ''; textarea.focus(); };
        const hidePanel = () => { panel.style.display = 'none'; textarea.value = ''; disputeBtn.disabled = false; disputeBtn.classList.remove('disabled-action'); };

        disputeBtn.addEventListener('click', () => {
          disputeBtn.disabled = true;
          disputeBtn.classList.add('disabled-action');
          // if editing existing dispute, ensure textarea has current reason
          if (disputeBtn.dataset.disputeId && ms.dispute && ms.dispute.reason) textarea.value = ms.dispute.reason;
          showPanel();
        });

        cancelBtn.addEventListener('click', (e) => { e.preventDefault(); hidePanel(); });

        submitBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const reason = textarea.value && textarea.value.trim();
          if (!reason) {
            showToast('Dispute reason is required', 'error');
            return;
          }
          submitBtn.disabled = true;
          try {
            // if dispute exists (dispute-id attribute), update; otherwise create
            if (disputeBtn.dataset.disputeId) {
              const disputeId = disputeBtn.dataset.disputeId;
              await apiRequest(`/disputes/${disputeId}`, 'PUT', { reason });
            } else {
              await apiRequest(`/disputes/${ms._id}`, 'POST', { reason });
            }
            showToast('Dispute raised', 'success');
            // update UI: set status cell and dispute cell
            const statusEl = row.querySelector('.status');
            if (statusEl) { statusEl.textContent = 'DISPUTED'; statusEl.className = 'status status-DISPUTED'; }
            const disputeCell = row.querySelector('.dispute-cell');
            if (disputeCell) disputeCell.textContent = reason;
            // adjust button label to Edit Dispute and attach dispute id if returned by server
            if (!disputeBtn.dataset.disputeId) {
              // try to fetch latest disputes to get id; simplest is reload row list
              loadMilestones();
            } else {
              hidePanel();
            }
          } catch (err) {
            showToast(err.message || 'Failed to raise dispute', 'error');
            submitBtn.disabled = false;
            disputeBtn.disabled = false;
            disputeBtn.classList.remove('disabled-action');
          }
        });
      }

    });
    

  } catch (err) {
    console.error(err);
    const list = document.getElementById('milestonesList');
    if (list) list.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
}

//approve milestone
async function approveMilestone(id) {
  try {
    const res = await apiRequest(`/milestones/approve/${id}`, 'PUT');
    showToast(res.message || 'Milestone approved', 'success');
    loadMilestones();
  } catch (err) {
    showToast(err.message || 'Failed to approve', 'error');
  }
}

//reject milestone
async function rejectMilestone(id) {
  try {
    const res = await apiRequest(`/milestones/reject/${id}`, 'PUT');
    showToast(res.message || 'Milestone rejected', 'success');
    loadMilestones();
  } catch (err) {
    showToast(err.message || 'Failed to reject', 'error');
  }
}

//Raise dispute on milestone
async function raiseDispute(id) {
  const reason = prompt("Enter dispute reason:");
  if (!reason || !reason.trim()) {
    showToast("Dispute reason is required", "error");
    return;
  }
  try {
    const res = await apiRequest(`/disputes/${id}`, "POST", {
      reason: reason.trim()
    });
    showToast("Dispute raised successfully", "success");
    loadMilestones(); // refresh UI
  } catch (err) {
    showToast(err.message || "Failed to raise dispute", "error");
  }
}

// init when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadMilestones();
});

// simple helper to avoid XSS when injecting values
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
