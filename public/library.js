const STORAGE_KEY = 'cssr_library_issues';

const initialIssues = [
  { student: "Sarah Namubiru", classStream: "S.2 Blue", title: "Physics for East Africa", status: "Issued" },
  { student: "David Musoke", classStream: "S.4 West", title: "Things Fall Apart", status: "Issued" },
  { student: "Grace Akello", classStream: "S.3 Central", title: "Integrated Biology", status: "Issued" }
];

function loadIssues() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialIssues));
    return initialIssues;
  }
  return JSON.parse(saved);
}

function saveIssues(issues) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

function renderTable() {
  const issues = loadIssues();
  const tbody = document.getElementById('issuedBooksTableBody');
  const issuedCount = document.getElementById('issuedBooksCount');

  if (tbody) {
    tbody.innerHTML = issues.map(item => `
      <tr>
        <td>${escapeHtml(item.student)}</td>
        <td>${escapeHtml(item.classStream)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="status-badge">${escapeHtml(item.status)}</span></td>
      </tr>
    `).join('');
  }

  if (issuedCount) {
    issuedCount.textContent = issues.length;
  }
}

function handleFormSubmit(e) {
  e.preventDefault();

  const studentInput = document.getElementById('studentName');
  const classInput = document.getElementById('classStream');
  const bookInput = document.getElementById('bookTitle');

  const newIssue = {
    student: studentInput.value.trim(),
    classStream: classInput.value,
    title: bookInput.value.trim(),
    status: "Issued"
  };

  const issues = loadIssues();
  issues.unshift(newIssue);
  saveIssues(issues);

  renderTable();

  studentInput.value = '';
  classInput.value = '';
  bookInput.value = '';
  document.getElementById('returnDate').value = '';

  alert(`Book successfully issued to ${newIssue.student}!`);
}

function setupNavigation() {
  const links = document.querySelectorAll('.nav-link');
  const pageTitle = document.getElementById('pageTitle');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const tabName = link.innerText;
      if (pageTitle) {
        pageTitle.textContent = `School Library - ${tabName}`;
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
  renderTable();
  setupNavigation();

  const form = document.getElementById('issueBookForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});
