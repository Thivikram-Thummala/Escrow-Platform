async function createContract() {
  const freelancerEmail = document.getElementById("freelancerEmail").value;
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const totalAmount = document.getElementById("amount").value;

  try {
    await apiRequest("/contracts", "POST", {
      freelancerEmail,
      title,
      description,
      totalAmount
    });

    showToast('Contract created', 'success');
    // refresh list on same page
    await loadContracts();
    // clear inputs and hide form
    document.getElementById("freelancerEmail").value = "";
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
    document.getElementById("amount").value = "";
    hideCreateForm();

  } catch (err) {
    showToast(err.message || 'Failed to create contract', 'error');
  }
}

async function acceptContract(id) {
  try {
    await apiRequest(`/contracts/${id}/accept`, "PUT");
    showToast('Contract accepted', 'success');
    await loadContracts();
  } catch (err) {
    showToast(err.message || 'Failed to accept', 'error');
  }
}

async function fundContract(id) {
  try {
    await apiRequest(`/contracts/${id}/fund`, "PUT");
    showToast('Escrow funded', 'success');
    await loadContracts();
  } catch (err) {
    showToast(err.message || 'Failed to fund', 'error');
  }
}

// Inline milestone creation handlers for contracts page
function showCreateInline(contractId) {
  const actionsEl = document.getElementById(`actions_${contractId}`);
  if (!actionsEl) return;
  actionsEl.innerHTML = `
    <div class="inline-ms">
      <input id="ms-title-${contractId}" type="text" placeholder="Milestone title" />
      <input id="ms-amount-${contractId}" type="number" placeholder="Amount" />
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button style="width:auto;padding:8px 12px;" onclick="submitInlineMilestone('${contractId}')">Create</button>
        <button style="width:auto;padding:8px 12px;" class="btn-secondary" onclick="cancelInline('${contractId}')">Cancel</button>
      </div>
    </div>
  `;
  const t = document.getElementById(`ms-title-${contractId}`);
  if (t) t.focus();
}

async function submitInlineMilestone(contractId) {
  try {
    const titleEl = document.getElementById(`ms-title-${contractId}`);
    const amountEl = document.getElementById(`ms-amount-${contractId}`);
    if (!titleEl || !amountEl) return;
    const title = titleEl.value && titleEl.value.trim();
    const amount = Number(amountEl.value);
    if (!title) { showToast('Enter a title', 'error'); return; }
    if (!amount || isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

    await apiRequest(`/milestones/${contractId}`, 'POST', { title, amount });
    showToast('Milestone created', 'success');
    await loadContracts();
  } catch (err) {
    showToast(err.message || 'Failed to create milestone', 'error');
  }
}

function cancelInline(contractId) {
  // re-render contracts to restore buttons
  loadContracts();
}

async function loadContracts() {
  try {
    const contracts = await apiRequest('/contracts');
    const me = await (async () => {
      try { return await apiRequest('/auth/me'); } catch { return null; }
    })();
    // fetch milestones so we can decide when 'Completed' should be enabled
    const allMilestones = await (async () => { try { return await apiRequest('/milestones'); } catch { return []; } })();

    const tbody = document.querySelector('#contractsTable tbody');
    const noEl = document.getElementById('noContracts');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!contracts || contracts.length === 0) {
      noEl.style.display = 'block';
      return;
    }

    noEl.style.display = 'none';

    contracts.forEach(contract => {
      const tr = document.createElement('tr');
      tr.dataset.id = contract._id;

      const clientEmail = contract.client?.email || '';
      const freelancerEmail = contract.freelancer?.email || '';

      // determine milestones and funded state from server data rather than localStorage

      tr.innerHTML = `
        <td>
          <div class="contract-title">${escapeHtml(contract.title || '')}</div>
          <button class="show-desc" data-id="${contract._id}"
          style="background: transparent;
                border: none;
                color: #2563eb;
                font-size: 13px;
                cursor: pointer;
                padding: 0;"
          >Show Description</button>
          <div class="contract-desc" style="display:none; margin-top:6px; color:#444">${escapeHtml(contract.description || '')}</div>
        </td>
        <td>${contract.totalAmount != null ? '₹' + Number(contract.totalAmount).toLocaleString('en-IN') : ''}</td>
        <td>${contract._id}</td>
        <td>${escapeHtml(clientEmail)}</td>
        <td>${escapeHtml(freelancerEmail)}</td>
        <td><span class="status status-${contract.status}">${contract.status}</span></td>
        <td style="text-align:right" id="actions_${contract._id}">
        </td>
      `;

      tbody.appendChild(tr);

      // wire up description toggle
      const showBtn = tr.querySelector('.show-desc');
      const descDiv = tr.querySelector('.contract-desc');
      if (showBtn && descDiv) {
        showBtn.addEventListener('click', () => {
          if (descDiv.style.display === 'none' || !descDiv.style.display) {
            descDiv.style.display = 'block';
            showBtn.textContent = 'Hide description';
          } else {
            descDiv.style.display = 'none';
            showBtn.textContent = 'Show description';
          }
        });
      }

      const actionsCell = document.getElementById(`actions_${contract._id}`);

      // milestones for this contract
      const msForContract = (allMilestones || []).filter(m => {
        const cid = m.contract && (m.contract._id || m.contract);
        return cid == contract._id;
      });
      const hasMilestone = (msForContract || []).length > 0;
      // determine funded from contract flag set by server
      const isFunded = !!contract.funded;
      const approvedResolvedSum = msForContract
        .filter(m => m.status === 'APPROVED' || m.status === 'RESOLVED')
        .reduce((s, m) => s + (Number(m.amount) || 0), 0);
      const totalMilestoneSum = msForContract.reduce((s, m) => s + (Number(m.amount) || 0), 0);
      // enable completion when approved/resolved milestones sum is equal or greater than contract total
      const canComplete = approvedResolvedSum >= Number(contract.totalAmount || 0);

      // Build Actions based on role
      
      if (me && me.role === 'freelancer' && contract.freelancer && (contract.freelancer._id || contract.freelancer) == me._id) {
        if (contract.status === 'PENDING') {
          actionsCell.innerHTML = `<button class="row-accept" data-id="${contract._id}">Accept</button>`;
          const acceptBtn = actionsCell.querySelector('.row-accept');
          acceptBtn.addEventListener('click', async () => {
            acceptBtn.disabled = true; acceptBtn.classList.add('disabled-action');
            try { await acceptContract(contract._id); } catch (err) { acceptBtn.disabled = false; acceptBtn.classList.remove('disabled-action'); }
          });
        }
      }

      if (me && me.role === 'client' && contract.client && (contract.client._id || contract.client) == me._id) {
        if (contract.status === 'ACTIVE') {
            // fund / create milestone buttons
            if (!isFunded) {
              actionsCell.innerHTML = `
                <button class="btn-fund" data-id="${contract._id}">Fund Escrow</button>
                <button class="btn-create disabled-action" id="create_${contract._id}" disabled>Create Milestone</button>
              `;
              const fundBtn = actionsCell.querySelector('.btn-fund');
              const createBtn = actionsCell.querySelector('.btn-create');
              fundBtn.addEventListener('click', async () => {
                // disable both during action
                fundBtn.disabled = true; createBtn.disabled = true;
                fundBtn.classList.add('disabled-action'); createBtn.classList.add('disabled-action');
                try {
                  await fundContract(contract._id);
                } catch (err) {
                  fundBtn.disabled = false; createBtn.disabled = false;
                  fundBtn.classList.remove('disabled-action'); createBtn.classList.remove('disabled-action');
                }
              });
            } else {

              // contract is funded: allow creating milestones while totalMilestoneSum < contract.totalAmount
              if (Number(totalMilestoneSum) < Number(contract.totalAmount || 0)) {
                actionsCell.innerHTML = `
                  <div class="contract-complete-msg">Escrow Funded</div>
                  <div class="milestones-amount-msg" style="margin-top:8px;">Milestones Total Amount: ₹${Number(totalMilestoneSum).toLocaleString('en-IN')}</div>
                  <div class="milestones-amount-msg">Resolved/Approved Amount: ₹${Number(approvedResolvedSum).toLocaleString('en-IN')}</div>                  
                  <button class="btn-createMilestone" id="create_${contract._id}">Create Milestone</button>
                `;
                const createBtn = document.getElementById(`create_${contract._id}`);
                if (createBtn) createBtn.addEventListener('click', () => showCreateInline(contract._id));
              } else {
                //client side check to mark contract as completed when milestones are fully approved/resolved and cover contract total, in case server missed it for some reason. Server is the source of truth for contract status, but this is an extra check to update UI promptly without waiting for next server update cycle.
                apiRequest(`/contracts/${contract._id}/complete`, 'PUT').then(() => {
                  loadContracts();// after marking complete, reload to update status and actions
                })  

                // fully allocated - show totals and resolved/approved amount in green color
                actionsCell.innerHTML = `
                  <div class="milestones-amount-msg">Milestones Total Amount: ₹${Number(totalMilestoneSum).toLocaleString('en-IN')}</div>
                  <div class="milestones-amount-msg">Resolved/Approved Amount: ₹${Number(approvedResolvedSum).toLocaleString('en-IN')}</div>
                `;
              }
            }
        }

        if(contract.status === 'COMPLETED') {
          actionsCell.innerHTML = `
            <div class="contract-complete-msg">Milestones Total Amount: ₹${Number(totalMilestoneSum).toLocaleString('en-IN')}</div>
            <div class="contract-complete-msg">Resolved/Approved Amount: ₹${Number(approvedResolvedSum).toLocaleString('en-IN')}</div>
          `;
        }
      }


      // server auto-updates contract status when milestones are fully approved/resolved 
      // after every approval/resolve action, server checks if approved/resolved milestones sum covers contract total and marks contract as completed
      // with one extra 
    });

  } catch (err) {
    showToast(err.message || 'Failed to load contracts', 'error');
  }
}

async function init() {
  // show/hide create form based on role
  let me = null;
  try { me = await apiRequest('/auth/me'); } catch { me = null; }

  const createEl = document.getElementById('createContract');
  const newBtn = document.getElementById('newContractBtn');
  const newBtnTop = document.getElementById('newContractBtnTop');
  if (createEl) {
    // keep form hidden initially; show "New Contract" button for clients
    createEl.style.display = 'none';
  }
  if (newBtn) {
    if (me && me.role === 'client') newBtn.style.display = 'inline-block';
    else newBtn.style.display = 'none';
  }
  if (newBtnTop) {
    if (me && me.role === 'client') newBtnTop.style.display = 'inline-block';
    else newBtnTop.style.display = 'none';
  }

  await loadContracts();
}

init();

// UI helpers to show/hide create form
function showCreateForm() {
  const form = document.getElementById('createContract');
  const btn = document.getElementById('newContractBtn');
  if (form) form.style.display = 'block';
  if (btn) btn.style.display = 'none';
}

function hideCreateForm() {
  const form = document.getElementById('createContract');
  const btn = document.getElementById('newContractBtn');
  if (form) form.style.display = 'none';
  if (btn) btn.style.display = 'inline-block';
}

// wire up buttons after DOM ready 
document.addEventListener('DOMContentLoaded', () => {
  const newBtn = document.getElementById('newContractBtn');
  const newBtnTop = document.getElementById('newContractBtnTop');
  const createBtn = document.getElementById('createContractBtn');
  const cancelBtn = document.getElementById('cancelCreateBtn');

  if (newBtn) newBtn.addEventListener('click', showCreateForm);
  if (newBtnTop) newBtnTop.addEventListener('click', showCreateForm);
  if (cancelBtn) cancelBtn.addEventListener('click', hideCreateForm);
  if (createBtn) createBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await createContract();
  });
});
