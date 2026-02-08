document.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = 'login.html';

    const transactions = await apiRequest('/transactions');

    const tbody = document.querySelector('#transactionsTable tbody');
    const noEl = document.getElementById('noTransactions');

    // clear any existing rows
    tbody.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      noEl.style.display = 'block';
      return;
    }

    noEl.style.display = 'none';

    transactions.forEach(tx => {
      const tr = document.createElement('tr');

      const dateTd = document.createElement('td');
      dateTd.textContent = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '';

      const typeTd = document.createElement('td');
      typeTd.textContent = tx.type || '';

      const fromTd = document.createElement('td');
      if (tx.type === 'REFUND_PAYMENT') {
        fromTd.textContent = 'Escrow account';
      } else {
        fromTd.textContent = tx.from ? (tx.from.email || tx.from.name || tx.from._id) : '';
      }

      const toTd = document.createElement('td');
      // If funding escrow, show 'Escrow account' instead of recipient email
      if (tx.type === 'FUND_ESCROW') {
        toTd.textContent = 'Escrow account';
      } else {
        toTd.textContent = tx.to ? (tx.to.email || tx.to.name || tx.to._id) : '';
      }

      const amountTd = document.createElement('td');
      amountTd.classList.add('amount-right');
      const amt = (tx.amount != null) ? Number(tx.amount) : null;
      amountTd.textContent = amt != null ? `₹${amt.toLocaleString('en-IN')}` : '';

      const contractTd = document.createElement('td');
      contractTd.textContent = tx.contract ? (tx.contract.title || tx.contract._id) : '';

      const statusTd = document.createElement('td');
      statusTd.textContent = tx.status || '';

      tr.appendChild(contractTd);
      tr.appendChild(typeTd);
      tr.appendChild(fromTd);
      tr.appendChild(toTd);
      tr.appendChild(amountTd);
      tr.appendChild(dateTd);
      tr.appendChild(statusTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load transactions', err);
    showToast(err.message || 'Failed to load transactions', 'error');
  }
});
