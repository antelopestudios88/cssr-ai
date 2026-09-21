const ISSUES_STORAGE_KEY = 'cssr_library_issues';
const TOTAL_BOOKS_KEY = 'cssr_total_books_stock';

const initialIssues = [
  { id: 1, student: "Sarah Namubiru", classStream: "S.2", title: "Physics for East Africa", dueDate: "2026-03-10", status: "Issued" },
  { id: 2, student: "David Musoke", classStream: "S.4", title: "Things Fall Apart", dueDate: "2026-02-15", status: "Overdue" },
  { id: 3, student: "Grace Akello", classStream: "S.3", title: "Integrated Biology", dueDate: "2026-03-25", status: "Issued" }
];

// Load Total Books Stock or Set Default (1,250)
function getTotalBooks() {
  const saved = localStorage.getItem(TOTAL_BOOKS_KEY);
  return saved ? parseInt(saved, 10) : 1250;
}

// Librarian can update the total inventory count
function updateTotalBooks() {
  const currentTotal = getTotalBooks();
  const input = prompt("Enter the new total number of books in the library:", currentTotal);
  
  if (input !== null && !isNaN(input) && input.trim() !== '') {
    const newTotal = parseInt(input.trim(), 10);
    localStorage.setItem(TOTAL_BOOKS_KEY, newTotal);
    renderDashboard();
    alert(`Total library book stock updated to ${newTotal.toLocaleString()}!`);
  }
}

function loadIssues() {
  const saved = localStorage.getItem(ISSUES_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(initialIssues));
    return initialIssues;
  }
  return JSON.parse(saved);
}

function saveIssues(issues) {
  localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issues));
  renderDashboard();
}

function renderDashboard() {
  const issues = loadIssues();
  const totalStock = getTotalBooks();

  // Update Statistics KPI Cards
  document.getElementById('totalBooksCount').textContent = totalStock.toLocaleString();
  
  const activeIssues = issues.filter(i => i.status === 'Issued' || i.status === 'Overdue');
  document.getElementById('issuedBooksCount').textContent = activeIssues.length;

  const overdueIssues = issues.filter(i => i.status === 'Overdue');
  document.getElementById('overdueBooksCount').textContent = overdueIssues.length;

  // Render Dashboard Table
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

  // Render Students Tab Data
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

  // Render Overdue Tab Data
  const overdueTbody = document.getElementById('overdueTableBody');
  if (overdueTbody) {
    const overdues = issues.filter(i => i.status === 'Overdue');
    if (overdues.length === 0) {
      overdueTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No overdue books pending.</td></tr>`;
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

function handleIssueSubmit(e) {
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

  const issues = loadIssues();
  issues.unshift(newIssue);
  saveIssues(issues);

  form.reset();
  alert(`Book "${title}" issued successfully to ${student}!`);
}

function returnBook(id) {
  let issues = loadIssues();
  issues = issues.map(item => {
    if (item.id === id) {
      return { ...item, status: 'Returned' };
    }
    return item;
  });
  saveIssues(issues);
}

function setupNavigation() {
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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  setupNavigation();

  const dashForm = document.getElementById('issueBookFormDashboard');
  if (dashForm) dashForm.addEventListener('submit', handleIssueSubmit);

  const dedicatedForm = document.getElementById('issueBookFormDedicated');
  if (dedicatedForm) dedicatedForm.addEventListener('submit', handleIssueSubmit);
});
