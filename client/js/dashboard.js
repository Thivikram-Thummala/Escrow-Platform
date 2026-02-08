async function loadContracts() {
  try {
    const contracts = await apiRequest("/contracts");

    const container = document.getElementById("userInfo");
    // keep backward compatible id; userInfo is inside main-col
    container.innerHTML = "";

    if (!contracts || contracts.length === 0) {
      container.innerHTML = "<p>No contracts found</p>";
      return;
    }

    console.log("contracts", contracts);

    const currentUserId = localStorage.getItem("userId");
    // fetch milestones for update so UI doesn't rely on localStorage flags 
    const allMilestones = await (async () => { try { return await apiRequest('/milestones'); } catch { return []; } })();

    const idOf = v => v && (v._id ? String(v._id) : String(v));

    contracts.forEach(contract => {
      // debug: log key values so visibility issues can be diagnosed
      try {
        console.debug('contract-debug', {
          id: contract._id,
          title: contract.title,
          status: contract.status,
          client: contract.client,
          freelancer: contract.freelancer,
          currentUserId
        });
      } catch (e) {
        console.debug('contract-debug error', e);
      }
      const div = document.createElement("div");
      div.className = 'contractItem';
      div.style.border = "1px solid #ccc";
      div.style.padding = "10px";
      div.style.marginBottom = "10px";

        // belows comments are for milestone and funding state visibility during development, 
        // as these were previously managed by localStorage flags which could get out of sync. 
        // Now the UI tries to determine these states from server data for better reliability, 
        // but the comments are left here for reference.

      // const fundedKey = `funded_${contract._id}`;
      // const milestoneKey = `milestone_${contract._id}`;
      // const isFunded = localStorage.getItem(fundedKey) === 'true';
      // const hasMilestone = localStorage.getItem(milestoneKey) === 'true';

      // determine milestone/funded state from server
      const msForContract = (allMilestones || []).filter(m => {
        const cid = m.contract && (m.contract._id || m.contract);
        return cid == contract._id;
      });
      const hasMilestone = (msForContract || []).length > 0;
      const isFunded = !!contract.funded;

      // status badge
      const statusBadge = `<span class="status status-${contract.status}">${contract.status}</span>`;

      // Determine who can act
      const clientId = idOf(contract.client);
      const freelancerId = idOf(contract.freelancer);
      const isClient = currentUserId && clientId && currentUserId === clientId;
      const isFreelancer = currentUserId && freelancerId && currentUserId === freelancerId;

      // Buttons
      let actionsHtml = `<div class="contract-actions" id="actions_${contract._id}">`;

      // Freelancer accepts PENDING
      if (isFreelancer && contract.status === 'PENDING') {
        actionsHtml += `<button onclick="acceptContract('${contract._id}')">Accept</button>`;
      }

      // Client actions when ACTIVE
      if (isClient && contract.status === 'ACTIVE') {
        // If no milestone yet
        if (!hasMilestone) {
          // Fund button shown when not funded
          if (!isFunded) {
            actionsHtml += `<button onclick="fundEscrow('${contract._id}')">Fund Escrow</button>`;
            // Create milestone button visible but disabled until funded (tooltip explains)
            actionsHtml += `<button class="btn-disabled" id="create_${contract._id}" onclick="createMilestone('${contract._id}')" disabled title="Fund escrow to enable">Create Milestone</button>`;
          } else {
            // funded: hide fund, enable create
            actionsHtml += `<button id="create_${contract._id}" onclick="createMilestone('${contract._id}')">Create Milestone</button>`;
          }
        }
      }

      actionsHtml += '</div>';

      // Completed or funded message
      let completeMsg = '';
      if (hasMilestone) {
        completeMsg = `<div class="contract-complete-msg">Milestone created</div>`;
      } else if (isFunded) {
        completeMsg = `<div class="contract-complete-msg">Escrow funded</div>`;
      }

      div.innerHTML = `
        <h4>${contract.title} ${statusBadge}</h4>
        <p>Total: ₹${contract.totalAmount}</p>
        ${actionsHtml}
        ${completeMsg}
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    const container = document.getElementById("userInfo");
    if (container) container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
}

// load wallet balances (localStorage fallback)
async function loadWallet() {
  const wEl = document.getElementById('walletBalance');
  const lEl = document.getElementById('lockedBalance');
  if (!wEl || !lEl) return;
  // try to fetch from server endpoint if available
  try {
    const res = await apiRequest('/wallet');
    wEl.textContent = `₹${res.balance || 0}`;
    lEl.textContent = `₹${res.locked || 0}`;
    return;
  } catch (e) {
    // ignore and use localStorage
  }

  const wallet = Number(localStorage.getItem('walletBalance')) || 0;
  const locked = Number(localStorage.getItem('lockedBalance')) || 0;
  wEl.textContent = `₹${wallet}`;
  lEl.textContent = `₹${locked}`;
}

// update wallet UI and localStorage
function updateWalletUI(balance, locked) {
  const wEl = document.getElementById('walletBalance');
  const lEl = document.getElementById('lockedBalance');
  if (wEl) wEl.textContent = `₹${Number(balance || 0)}`;
  if (lEl) lEl.textContent = `₹${Number(locked || 0)}`;
  try {
    localStorage.setItem('walletBalance', String(Number(balance || 0)));
    localStorage.setItem('lockedBalance', String(Number(locked || 0)));
  } catch (e) { /* ignore storage errors */ }
}

// Prompt user to add funds to wallet
async function promptAddToWallet() {
  const amount = await showAmountModal('Enter amount to add to wallet (₹):');
  if (amount === null) return; // cancelled
  try {
    const res = await apiRequest('/wallet/add', 'POST', { amount });
    updateWalletUI(res.balance, res.locked);
    showToast('Amount added to wallet', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to add', 'error');
  }
}

// Prompt user to withdraw funds from wallet
async function promptWithdrawFromWallet() {
  const amount = await showAmountModal('Enter amount to withdraw (₹):');
  if (amount === null) return; // cancelled
  // confirm withdrawal
  const ok = await showConfirm(`Withdraw ₹${amount} from your wallet?`);
  if (!ok) return;
  try {
    const res = await apiRequest('/wallet/withdraw', 'POST', { amount });
    updateWalletUI(res.balance, res.locked);
    showToast('Withdrawal successful', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to withdraw', 'error');
  }
}

// Amount input modal returning Promise<number|null>
window.showAmountModal = function (message, defaultValue = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div style="margin-bottom:8px;">${message}</div>
        <input id="amountModalInput" type="number" placeholder="Amount" style="width:90%;padding:10px;margin-bottom:8px;" value="${defaultValue}" />
        <div class="confirm-actions">
          <button id="amountCancel">Cancel</button>
          <button id="amountOk" class="btn-primary">OK</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#amountModalInput');
    const cancelBtn = overlay.querySelector('#amountCancel');
    const okBtn = overlay.querySelector('#amountOk');

    // focus and select
    setTimeout(() => { if (input) { input.focus(); input.select(); } }, 10);

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => cleanup(null));
    okBtn.addEventListener('click', () => {
      const val = input.value;
      const num = Number(val);
      if (!num || isNaN(num) || num <= 0) {
        showToast('Enter a valid amount', 'error');
        return;
      }
      cleanup(num);
    });

    // keyboard support
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') okBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
  });
};

async function loadProfile() {
  const profileEl = document.getElementById("profileSection");
  if (!profileEl) return;

  let email = localStorage.getItem("userEmail") || null;
  let role = localStorage.getItem("userRole") || null;
  let id = null;

  // Try to fetch fresh profile from server
  try {
    const data = await apiRequest("/auth/me");
    if (data && data.email) {
      email = data.email;
      role = data.role || role;
      id = data._id || null;
      // sync localStorage
      localStorage.setItem("userEmail", email);
      if (role) localStorage.setItem("userRole", role);
      if (id) localStorage.setItem("userId", id);
    }
  } catch (err) {
    // ignore server error and fallback to localStorage values
    console.warn('Could not fetch profile', err.message || err);
  }

  email = email || "Unknown";
  role = role || "-";
  id = id || localStorage.getItem("userId") || null;

  profileEl.innerHTML = `
    <div class="left">
      <div class="avatar">${(email && email[0] ? email[0] : 'U').toUpperCase()}</div>
      <div class="info">
        <div class="email">${email}</div>
        <div class="id">${id ? `ID: ${id}` : ""}</div>
        <div class="role">${role}</div>
      </div>
    </div>
    <div class="right">
      <!-- reserved for actions -->
    </div>
  `;
}

// Simple toast helper
window.showToast = function (message, type = 'info', timeout = 3000) {
  try {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, timeout);
  } catch (e) { console.warn('toast failed', e); }
};

// Simple confirm modal returning Promise<boolean>
window.showConfirm = function (message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div>${message}</div>
        <div class="confirm-actions">
          <button id="confirmCancel">Cancel</button>
          <button id="confirmOk" class="btn-primary">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmCancel').addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.querySelector('#confirmOk').addEventListener('click', () => { overlay.remove(); resolve(true); });
  });
};

async function acceptContract(id) {
  try {
    await apiRequest(`/contracts/${id}/accept`, "PUT");
    showToast('Contract accepted', 'success');
    loadContracts();
  } catch (err) {
    showToast(err.message || 'Failed to accept', 'error');
  }
}

async function fundEscrow(id) {
  try {
    await apiRequest(`/contracts/${id}/fund`, "PUT");
    // mark funded locally so UI can enable milestone creation
    localStorage.setItem(`funded_${id}`, 'true');
    // mark funded locally so UI can enable milestone creation
    localStorage.setItem(`funded_${id}`, 'true');
    // mark funded locally so UI can enable milestone creation
    localStorage.setItem(`funded_${id}`, 'true');
    showToast('Escrow funded', 'success');
    loadContracts();
  } catch (err) {
    showToast(err.message || 'Failed to fund', 'error');
  }
}

async function createMilestone(contractId) {
  // enforce that escrow was funded locally
  const isFunded = localStorage.getItem(`funded_${contractId}`) === 'true';
  if (!isFunded) {
    showToast('Please fund escrow before creating a milestone', 'info');
    return;
  }

  // render inline form inside the contract's actions area
  const actionsEl = document.getElementById(`actions_${contractId}`);
  if (!actionsEl) return;

  actionsEl.innerHTML = `
    <div class="inline-ms">
      <input id="ms-title-${contractId}" type="text" placeholder="Milestone title" />
      <input id="ms-amount-${contractId}" type="number" placeholder="Amount" />
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button style="width:auto;padding:8px 12px;" onclick="submitInlineMilestone('${contractId}')">Create</button>
        <button style="width:auto;padding:8px 12px;" class="btn-secondary" onclick="cancelInlineMilestone('${contractId}')">Cancel</button>
      </div>
    </div>
  `;
  // autofocus title input
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
    loadContracts();
  } catch (err) {
    showToast(err.message || 'Failed to create milestone', 'error');
  }
}

function cancelInlineMilestone(contractId) {
  // simply re-render the list to restore previous buttons
  loadContracts();
}

// Render profile then contracts
async function init() {
  await loadProfile();
  // only load contracts on pages that have the `userInfo` container (dashboard)
  if (document.getElementById('userInfo')) {
    await loadContracts();
    await loadWallet();
  }
}

init();
