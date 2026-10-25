const app = document.getElementById("app");
const askDialog = document.getElementById("askDialog");
const askForm = document.getElementById("askForm");
const askError = document.getElementById("askError");

let filters = { q: "", tag: "", sort: "new" };

// ---------- helpers ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return Math.floor(s / 86400) + " d ago";
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

const tagsHtml = (tags) =>
  tags.map((t) => `<button class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("");

// ---------- list view ----------
async function renderList() {
  const params = new URLSearchParams(filters);
  const questions = await api("/api/questions?" + params);

  app.innerHTML = `
    <div class="toolbar">
      <input id="search" type="search" placeholder="Search questions…" value="${esc(filters.q)}" />
      <select id="sort">
        <option value="new" ${filters.sort === "new" ? "selected" : ""}>Newest</option>
        <option value="votes" ${filters.sort === "votes" ? "selected" : ""}>Most votes</option>
      </select>
      ${filters.tag ? `<button class="btn" id="clearTag">Tag: ${esc(filters.tag)} ✕</button>` : ""}
    </div>
    ${
      questions.length
        ? questions
            .map(
              (q) => `
      <article class="card">
        <div class="stats">
          <div><strong>${q.votes}</strong>votes</div>
          <div class="${q.solved ? "solved" : ""}"><strong>${q.answerCount}</strong>${q.solved ? "✓ solved" : "answers"}</div>
        </div>
        <div>
          <h3><a href="#/q/${q.id}">${esc(q.title)}</a></h3>
          <p class="excerpt">${esc(q.body.slice(0, 140))}${q.body.length > 140 ? "…" : ""}</p>
          <div>${tagsHtml(q.tags)} <span class="meta">${esc(q.author)} · ${timeAgo(q.createdAt)}</span></div>
        </div>
      </article>`
            )
            .join("")
        : `<p class="empty">No questions found. Be the first to ask!</p>`
    }`;

  let timer;
  document.getElementById("search").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      filters.q = e.target.value;
      const pos = e.target.selectionStart;
      await renderList();
      const el = document.getElementById("search");
      el.focus();
      el.setSelectionRange(pos, pos);
    }, 250);
  });
  document.getElementById("sort").addEventListener("change", (e) => {
    filters.sort = e.target.value;
    renderList();
  });
  const clear = document.getElementById("clearTag");
  if (clear) clear.addEventListener("click", () => { filters.tag = ""; renderList(); });
  app.querySelectorAll(".tag").forEach((b) =>
    b.addEventListener("click", () => { filters.tag = b.dataset.tag; renderList(); })
  );
}

// ---------- detail view ----------
async function renderQuestion(id) {
  const q = await api("/api/questions/" + id);

  app.innerHTML = `
    <p><a href="#/">← All questions</a></p>
    <article class="card">
      <div class="vote">
        <button data-vote="1" aria-label="Upvote question">▲</button>
        <span>${q.votes}</span>
        <button data-vote="-1" aria-label="Downvote question">▼</button>
      </div>
      <div>
        <h2 style="margin-top:0">${esc(q.title)}</h2>
        <div class="q-body">${esc(q.body)}</div>
        <div>${tagsHtml(q.tags)} <span class="meta">asked by ${esc(q.author)} · ${timeAgo(q.createdAt)}</span></div>
      </div>
    </article>

    <h2>${q.answers.length} Answer${q.answers.length === 1 ? "" : "s"}</h2>
    ${q.answers
      .map(
        (a) => `
      <article class="card answer ${a.accepted ? "accepted" : ""}">
        <div class="vote">
          <button data-avote="1" data-id="${a.id}" aria-label="Upvote answer">▲</button>
          <span>${a.votes}</span>
          <button data-avote="-1" data-id="${a.id}" aria-label="Downvote answer">▼</button>
        </div>
        <div style="flex:1">
          ${a.accepted ? `<div class="badge">✓ Accepted answer</div>` : ""}
          <div class="q-body">${esc(a.body)}</div>
          <div class="meta">${esc(a.author)} · ${timeAgo(a.createdAt)}
            <button class="btn small" data-accept="${a.id}">${a.accepted ? "Unaccept" : "Accept answer"}</button>
          </div>
        </div>
      </article>`
      )
      .join("")}

    <h2>Your answer</h2>
    <form id="answerForm">
      <label>Your name <input name="author" maxlength="40" placeholder="Anonymous" /></label>
      <label>Answer <textarea name="body" rows="5" maxlength="5000" required></textarea></label>
      <p id="answerError" class="error" hidden></p>
      <button class="btn primary" type="submit">Post answer</button>
    </form>`;

  const reload = () => renderQuestion(id);

  app.querySelectorAll("[data-vote]").forEach((b) =>
    b.addEventListener("click", async () => {
      await api(`/api/questions/${id}/vote`, { method: "POST", body: { delta: Number(b.dataset.vote) } });
      reload();
    })
  );
  app.querySelectorAll("[data-avote]").forEach((b) =>
    b.addEventListener("click", async () => {
      await api(`/api/questions/${id}/answers/${b.dataset.id}/vote`, { method: "POST", body: { delta: Number(b.dataset.avote) } });
      reload();
    })
  );
  app.querySelectorAll("[data-accept]").forEach((b) =>
    b.addEventListener("click", async () => {
      await api(`/api/questions/${id}/answers/${b.dataset.accept}/accept`, { method: "POST" });
      reload();
    })
  );
  app.querySelectorAll(".tag").forEach((b) =>
    b.addEventListener("click", () => { filters.tag = b.dataset.tag; location.hash = "#/"; })
  );

  document.getElementById("answerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api(`/api/questions/${id}/answers`, { method: "POST", body: Object.fromEntries(f) });
      reload();
    } catch (err) {
      const box = document.getElementById("answerError");
      box.textContent = err.message;
      box.hidden = false;
    }
  });
}

// ---------- ask dialog ----------
document.getElementById("askBtn").addEventListener("click", () => {
  askError.hidden = true;
  askDialog.showModal();
});
document.getElementById("cancelAsk").addEventListener("click", () => askDialog.close());
askForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const q = await api("/api/questions", { method: "POST", body: Object.fromEntries(new FormData(askForm)) });
    askForm.reset();
    askDialog.close();
    location.hash = "#/q/" + q.id;
  } catch (err) {
    askError.textContent = err.message;
    askError.hidden = false;
  }
});

// ---------- router ----------
async function route() {
  const m = location.hash.match(/^#\/q\/(.+)$/);
  try {
    if (m) await renderQuestion(m[1]);
    else await renderList();
  } catch (err) {
    app.innerHTML = `<p class="empty">${esc(err.message)} — <a href="#/">go back</a></p>`;
  }
}
window.addEventListener("hashchange", route);
route();
