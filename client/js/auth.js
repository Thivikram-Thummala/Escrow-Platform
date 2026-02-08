async function registerUser() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  try {
    const data = await apiRequest("/auth/register", "POST", {
      name,
      email,
      password,
      role
    });

    localStorage.setItem("token", data.token);
    // Persist email and role so dashboard can display them without extra API call
    if (data.email) localStorage.setItem("userEmail", data.email);
    if (data.role) localStorage.setItem("userRole", data.role);
    window.location.href = "dashboard.html";
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
     // instead of alert(err.message), we show a toast notification for better UX
    // alert(err.message);
  }
}

async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const data = await apiRequest("/auth/login", "POST", {
      email,
      password
    });

    localStorage.setItem("token", data.token);
    // Save email and role for client-side display
    if (data.email) localStorage.setItem("userEmail", data.email);
    if (data.role) localStorage.setItem("userRole", data.role);
    // After login, redirect to this page
    if(data.role === 'admin') {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}
