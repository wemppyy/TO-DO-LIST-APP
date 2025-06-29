const $ = id => document.getElementById(id);

const API = "http://localhost:5800/todo";


// Анімація появи та приховування .add-item
$("addButton").onclick = () => {
    const addItem = $("addItem");
    addItem.style.display = 'block';
    // Тригеримо анімацію через клас
    setTimeout(() => addItem.classList.add('active'), 10);
};

$("closeWindowBtn").onclick = () => {
    const addItem = $("addItem");
    addItem.classList.remove('active');
    // Чекаємо завершення анімації, потім приховуємо
    setTimeout(() => {
        addItem.style.display = 'none';
    }, 500);
};

/* При завантаженні сторінки викликається loadTodoList */
window.addEventListener('DOMContentLoaded', loadTodoList);

// Обробка відправки форми додавання задачі
$("submitButton").onclick = async e => {
    e.preventDefault();
    // Отримуємо значення з полів форми
    const title = $("task-name").value.trim();
    const description = $("task-description").value.trim();
    const completeTime = $("task-date").value;
    try {
        // Відправляємо POST-запит на сервер для додавання задачі
        const res = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, isCompleted: false, completeTime })
        });
        if (!res.ok) throw new Error(await res.text());
        // Очищаємо форму і закриваємо вікно
        $("task-name").value = '';
        $("task-description").value = '';
        $("task-date").value = '';
        $("addItem").style.display = 'none';
        // Оновлюємо список задач
        loadTodoList();
    } catch (err) {
        alert('Помилка при додаванні задачі: ' + err.message);
    }
};


// Делегування подій для кнопок видалення задач
$("todoList").onclick = function(e) {
    if (e.target.classList.contains('close-btn')) {
        const taskDiv = e.target.closest('.task');
        const id = taskDiv.getAttribute('data-id');
        console.log(`Видалення задачі з ID: ${id}`);
        
        if (id) deleteTodoItem(id);
    }
};

window.addEventListener('DOMContentLoaded', loadTodoList);

// Отримання списку задач з сервера і відображення їх на сторінці
async function loadTodoList() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        renderTodoList(data);
    } catch (err) {
        console.error("ПОМИЛКА:", err);
    }
}


// Форматування дати для гарного відображення
function formatDate(dateStr) {
    if (!dateStr) return '';
    // Перетворюємо рядок у Date
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    // Отримуємо YYYY-MM-DD HH:mm
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Відображення списку задач на сторінці
function renderTodoList(todos) {
    const todoList = $("todoList");
    todoList.innerHTML = '';
    todos.forEach((todo, i) => {
        const dateStr = formatDate(todo.CompleteTime || todo.completeTime);
        const div = document.createElement('div');
        div.className = 'task';
        div.setAttribute('data-id', todo.Id || todo.id);
        div.innerHTML = `
            <div class="info">
                <h1>${todo.Title || todo.title}</h1>
                <p>${todo.Description || todo.description}</p>
            </div>
            <div class="date">${dateStr}</div>
            <button class="close-btn">✖</button>
        `;
        todoList.appendChild(div);
        // Анімація появи із затримкою для плавності
        setTimeout(() => div.classList.add('task-in'), 30 + i * 60);
    });
}

function deleteTodoItem(id) {
    const taskDiv = document.querySelector(`.task[data-id="${id}"]`);
    if (taskDiv) {
        taskDiv.classList.remove('task-in');
        taskDiv.classList.add('task-out');
        setTimeout(() => {
            fetch(`${API}/${id}`, {
                method: 'DELETE',
            })
            .then(res => {
                if (!res.ok) throw new Error('Помилка при видаленні задачі');
                loadTodoList();
            })
            .catch(err => alert(err.message));
        }, 400); // час співпадає з transition
    } else {
        // fallback якщо не знайдено div
        fetch(`${API}/${id}`, {
            method: 'DELETE',
        })
        .then(res => {
            if (!res.ok) throw new Error('Помилка при видаленні задачі');
            loadTodoList();
        })
        .catch(err => alert(err.message));
    }
}


$("sendToAIBtn").onclick = () => {
    const textInput = $("textToAI");
    if (!textInput) {
        alert('Поле для введення тексту не знайдено!');
        return;
    }
    const text = textInput.value.trim();
    if (text) {
        const btn = $("sendToAIBtn");
        btn.disabled = true;
        const oldContent = btn.innerHTML;
        btn.innerHTML = '🔄';
        fetch(`${API}/ai-process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(text)
        })
        .then(res => {
            if (!res.ok) throw new Error('Помилка при обробці AI');
            return res.json();
        })
        .then(() => {
            loadTodoList();
        })
        .catch(err => alert(err.message))
        .finally(() => {
            btn.innerHTML = oldContent;
            btn.disabled = false;
            textInput.value = '';
        });
    } else {
        alert('Будь ласка, введіть текст для AI');
    }
}