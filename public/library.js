// =========================================
// CSS-R Library System Core Scripts
// =========================================

// Local Storage Keys
const ISSUES_STORAGE_KEY = 'cssr_library_issues_v2';
const TOTAL_BOOKS_KEY = 'cssr_total_books_stock_v2';

// Sample borrowing data for initial initialization
const initialIssues = [
  { id: 1, student: "Sarah Namubiru", classStream: "S.2", title: "Physics for East Africa", dueDate: "2026-03-10", status: "Issued" },
  { id: 2, student: "David Musoke", classStream: "S.4", title: "Things Fall Apart", dueDate: "2026-02-15", status: "Overdue" },
  { id: 3, student: "Grace Akello", classStream: "S.3", title: "Integrated Biology", dueDate: "2026-03-25", status: "Issued" }
];

// Helper to escape HTML and prevent injection attacks
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}

// Custom Toast Banner Notification (Replaces Browser native alert())
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// 1. Data Loading Functions
function getTotalBooksStock() {
  const saved = localStorage.getItem(TOTAL_BOOKS_KEY);
  return saved ? parseInt(saved, 10) : 1250;
}

function loadBorrowingRecords() {
  const saved = localStorage.getItem(ISSUES_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(initialIssues));
    return initialIssues;
  }
  return JSON.parse(saved);
}

// 2. Data Saving Functions
function saveBorrowingRecords(issues) {
  localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issues));
  renderApplicationState(); // Re-render application whenever data changes
}

function saveTotalBooksStock(newTotal) {
  localStorage.setItem(TOTAL_BOOKS_KEY, newTotal);
  renderApplicationState(); // Re-render application whenever data changes
}

// 3. UI Redraw (Main Render) Function
function renderApplicationState() {
  const issues = loadBorrowingRecords();
  const totalStock = getTotalBooksStock();

  // A. Update KPI Stat Cards
  document.getElementById('totalBooksCount').textContent = totalStock.toLocaleString();

  const activeIssues = issues.filter(i => i.status === 'Issued' || i.status === 'Overdue');
  document.getElementById('issuedBooksCount').textContent = activeIssues.length;

  const overdueIssues = issues.filter(i => i.status === 'Overdue');
  document.getElementById('overdueBooksCount').textContent = overdueIssues.length;

  // B. Render Dashboard Table (Tab 1)
  const dashTbody = document.getElementById('dashboardTableBody');
  if (dashTbody) {
    dashTbody.innerHTML = issues.map(item => `
      <tr>
        <td>${escapeHtml(item.student)}</td>
        <td>${escapeHtml(item.classStream)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>
          <span class="status-badge" style="background-color: ${
            item.status === 'Returned' ? '#e2e8f0' : item.status === 'Overdue' ? '#fee2e2' : '#dcfce7'
          }; color: ${
            item.status === 'Returned' ? '#475569' : item.status === 'Overdue' ? '#991b1b' : '#166534'
          };">
            ${escapeHtml(item.status)}
          </span>
        </td>
        <td>
          ${item.status !== 'Returned' ?
            `<button onclick="returnBook(${item.id})" style="padding: 4px 8px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Return</button>` :
            `<span style="color: #94a3b8; font-size: 0.8rem;">Returned</span>`
          }
        </td>
      </tr>
    `).join('');
  }

  // C. Render Students Tab Data (Tab 4)
  const studentsTbody = document.getElementById('studentsTableBody');
  if (studentsTbody) {
    const studentMap = {};
    issues.forEach(i => {
      if (!studentMap[i.student]) {
        studentMap[i.student] = { name: i.student, classStream: i.classStream, count: 0 };
      }
      studentMap[i.student].count += 1;
    });

    studentsTbody.innerHTML = Object.values(studentMap).map(s => `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.classStream)}</td>
        <td>${s.count} book(s)</td>
      </tr>
    `).join('');
  }

  // D. Render Overdue Tab Data (Tab 5)
  const overdueTbody = document.getElementById('overdueTableBody');
  if (overdueTbody) {
    const overdues = issues.filter(i => i.status === 'Overdue');
    if (overdues.length === 0) {
      overdueTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">No overdue books pending.</td></tr>`;
    } else {
      overdueTbody.innerHTML = overdues.map(i => `
        <tr>
          <td>${escapeHtml(i.student)}</td>
          <td>${escapeHtml(i.classStream)}</td>
          <td>${escapeHtml(i.title)}</td>
          <td>${escapeHtml(i.dueDate || 'N/A')}</td>
          <td><span class="status-badge" style="background-color:#fee2e2; color:#991b1b;">Overdue</span></td>
        </tr>
      `).join('');
    }
  }
}

// =========================================
// CUSTOM MODAL LOGIC (Promises)
// Replaces boring prompt() and alert()
// =========================================

// Cache Modal DOM References
const modalOverlay = document.getElementById('customModalOverlay');
const modalInput = document.getElementById('modalStockInput');
const cancelBtn = document.getElementById('modalCancelBtn');
const okBtn = document.getElementById('modalOkBtn');

// Launches the professional custom prompt
function launchCustomPrompt(defaultValue) {
  return new Promise((resolve) => {
    // 1. Initialize Modal
    modalInput.value = defaultValue;
    modalOverlay.classList.remove('hidden');
    void modalOverlay.offsetWidth;
    modalOverlay.classList.add('active');

    modalInput.focus();

    // 2. Define Clean Closure Functions for Cleanup
    function cleanupAndResolve(value) {
      cancelBtn.removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleOk);
      modalInput.removeEventListener('keydown', handleKeydown);

      modalOverlay.classList.remove('active');
      setTimeout(() => {
        modalOverlay.classList.add('hidden');
      }, 300);

      resolve(value);
    }

    // 3. Handle Button Click Logic
    function handleCancel() {
      cleanupAndResolve(null);
    }

    function handleOk() {
      const input = modalInput.value.trim();
      cleanupAndResolve(input);
    }

    function handleKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOk();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    }

    // 4. Attach Events to the Specific Promise Instance
    cancelBtn.addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleOk);
    modalInput.addEventListener('keydown', handleKeydown);
  });
}

async function updateTotalBooks() {
  const currentTotal = getTotalBooksStock();
  const userInput = await launchCustomPrompt(currentTotal);

  if (userInput !== null && userInput.trim() !== '' && !isNaN(userInput)) {
    const newTotal = parseInt(userInput.trim(), 10);
    saveTotalBooksStock(newTotal);

    showToast(`Library total stock updated to ${newTotal.toLocaleString()} successfully! 🥰😘`);
  }
}

// =========================================
// Functional Interactions (Links, Forms)
// =========================================

function returnBook(id) {
  let issues = loadBorrowingRecords();
  issues = issues.map(item => {
    if (item.id === id) {
      return { ...item, status: 'Returned' };
    }
    return item;
  });
  saveBorrowingRecords(issues);
  showToast("Book status updated to Returned! 🥰😘");
}

function handleIssueFormSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const student = form.querySelector('.input-student').value.trim();
  const classStream = form.querySelector('.input-class').value;
  const title = form.querySelector('.input-title').value.trim();
  const dueDate = form.querySelector('.input-date').value;

  const newIssue = {
    id: Date.now(),
    student,
    classStream,
    title,
    dueDate,
    status: "Issued"
  };

  const issues = loadBorrowingRecords();
  issues.unshift(newIssue);
  saveBorrowingRecords(issues);

  form.reset();
  showToast(`Book "${title}" issued successfully to ${student}! 🥰😘`);
}

function setupSidebarNavigation() {
  const links = document.querySelectorAll('.nav-link');
  const pageTitle = document.getElementById('pageTitle');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const targetTab = link.getAttribute('data-tab');
      document.querySelectorAll('.tab-section').forEach(section => {
        section.classList.remove('active');
      });

      const activeSection = document.getElementById(`tab-${targetTab}`);
      if (activeSection) {
        activeSection.classList.add('active');
      }

      if (pageTitle) {
        pageTitle.textContent = `School Library - ${link.textContent}`;
      }
    });
  });
}

// 4. Dom Content Loading Initialization
document.addEventListener('DOMContentLoaded', () => {
  renderApplicationState();
  setupSidebarNavigation();

  const dashForm = document.getElementById('issueBookFormDashboard');
  if (dashForm) dashForm.addEventListener('submit', handleIssueFormSubmit);

  const dedicatedForm = document.getElementById('issueBookFormDedicated');
  if (dedicatedForm) dedicatedForm.addEventListener('submit', handleIssueFormSubmit);
});
