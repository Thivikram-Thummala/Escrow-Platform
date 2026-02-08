(function(){
	function ensureToastContainer(){
		let container = document.getElementById('toastContainer');
		if (!container) {
			container = document.createElement('div');
			container.id = 'toastContainer';
			container.className = 'toast-container';
			document.body.appendChild(container);
		}
		return container;
	}

	window.showToast = function(message, type = 'info', timeout = 3000){
		const container = ensureToastContainer();
		const t = document.createElement('div');
		t.className = 'toast ' + (type ? type : '');
		t.textContent = message;
		container.appendChild(t);
		setTimeout(()=>{
			t.classList.add('toast-fade');
			setTimeout(()=> t.remove(), 300);
		}, timeout);
	};

	window.showConfirm = function(message){
		return new Promise(resolve => {
			const overlay = document.createElement('div');
			overlay.className = 'confirm-overlay';
			const box = document.createElement('div');
			box.className = 'confirm-box';
			const msg = document.createElement('p');
			msg.textContent = message;
			const btns = document.createElement('div');
			btns.className = 'confirm-actions';
			const ok = document.createElement('button');
			ok.textContent = 'OK';
			ok.className = 'btn';
			const cancel = document.createElement('button');
			cancel.textContent = 'Cancel';
			cancel.className = 'btn btn-secondary';
			btns.appendChild(ok);
			btns.appendChild(cancel);
			box.appendChild(msg);
			box.appendChild(btns);
			overlay.appendChild(box);
			document.body.appendChild(overlay);

			ok.focus();

			ok.addEventListener('click', ()=>{
				overlay.remove();
				resolve(true);
			});
			cancel.addEventListener('click', ()=>{
				overlay.remove();
				resolve(false);
			});
		});
	};

	// Highlight current nav link based on filename
	function highlightCurrentNav(){
		try {
			const path = (window.location.pathname || '').split('/').pop();
			const current = path || 'dashboard.html';
			const links = document.querySelectorAll('.navbar a[href]');
			links.forEach(a => {
				const href = a.getAttribute('href') || '';
				const name = href.split('/').pop();
				if (name && name === current) a.classList.add('active');
				else a.classList.remove('active');
			});
		} catch (e) { /* ignore */ }
	}

	function showAdminNavItems(){
		try {
			const role = localStorage.getItem('userRole');
			const navDisputes = document.getElementById('navDisputes');
			if (navDisputes) navDisputes.style.display = (role === 'admin') ? '' : 'none';
		} catch (e) { /* ignore */ }
	}

	// expose a global escape helper so other pages can safely inject text
	//prevent "escapehtml is not defined" errors
	window.escapeHtml = function(str) {
		if (str === null || str === undefined) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	};

	document.addEventListener('DOMContentLoaded', () => { highlightCurrentNav(); showAdminNavItems(); });

})();

