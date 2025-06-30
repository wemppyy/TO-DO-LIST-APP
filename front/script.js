// Утиліта для скороченого доступу до елементів за ID
const $ = id => document.getElementById(id);

// Базовий URL для API
const API = "http://localhost:5800/todo";
// Час анімації в мс, має відповідати CSS
const ANIMATION_TIME = 500;


// Універсальна функція для показу/приховування модальних вікон з анімацією.
function toggleModal(modalId, show) {
    const modal = $(modalId);
    if (!modal) return;

    if (show) {
        modal.style.display = 'block';
        // Невеликий таймаут, щоб CSS встиг застосувати display: block перед анімацією
        setTimeout(() => modal.classList.add('active'), 10);
    } else {
        modal.classList.remove('active');
        // Чекаємо завершення анімації, перш ніж приховати елемент
        setTimeout(() => {
            modal.style.display = 'none';
        }, ANIMATION_TIME);
    }
}

// Відправляє текст до AI для обробки та оновлює список задач.

async function sendToAI(text) {
    const btn = $("sendToAIBtn");
    const oldContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🔄';

    try {
        const res = await fetch(`${API}/ai-process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(text)
        });
        if (!res.ok) throw new Error('Помилка під час обробки AI');
        await res.json(); // Очікуємо відповідь, навіть якщо вона порожня
        loadTodoList();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerHTML = oldContent;
        btn.disabled = false;
    }
}

// Обробники подій для кнопок відкриття/закриття модальних вікон
$("addButton").onclick = () => toggleModal("addItem", true);
$("closeWindowBtn").onclick = () => toggleModal("addItem", false);
$("searchBarBtn").onclick = () => toggleModal("record", true);
$("closeRecordBtn").onclick = () => toggleModal("record", false);

/* При завантаженні сторінки викликається loadTodoList */
window.addEventListener('DOMContentLoaded', loadTodoList);

// Обробка відправки форми додавання задачі
$("submitButton").onclick = async e => {
    e.preventDefault();
    const title = $("task-name").value.trim();
    const description = $("task-description").value.trim();
    const completeTime = $("task-date").value;

    if (!title) {
        alert('Будь ласка, введіть назву задачі.');
        return;
    }

    try {
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
        toggleModal("addItem", false);
        
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
        if (id) deleteTodoItem(id);
    }
};

// Отримання списку задач з сервера і відображення їх на сторінці
async function loadTodoList() {
    try {
        const res = await fetch(API);
        if (!res.ok) throw new Error('Не вдалося завантажити задачі');
        const data = await res.json();
        renderTodoList(data);
    } catch (err) {
        console.error("ПОМИЛКА:", err);
        alert(err.message);
    }
}

// Форматування дати для гарного відображення
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Перевірка на валідність дати
    
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
        // Нормалізація полів, що можуть мати різний регістр
        const id = todo.Id || todo.id;
        const title = todo.Title || todo.title;
        const description = todo.Description || todo.description;
        const dateStr = formatDate(todo.CompleteTime || todo.completeTime);

        const div = document.createElement('div');
        div.className = 'task';
        div.setAttribute('data-id', id);
        div.innerHTML = `
            <div class="info">
                <h1>${title}</h1>
                <p>${description}</p>
            </div>
            <div class="date">${dateStr}</div>
            <button class="close-btn">✖</button>
        `;
        todoList.appendChild(div);
        // Анімація появи із затримкою для плавності
        setTimeout(() => div.classList.add('task-in'), 30 + i * 60);
    });
}

// Видалення задачі з анімацією
function deleteTodoItem(id) {
    const taskDiv = document.querySelector(`.task[data-id="${id}"]`);
    if (taskDiv) {
        taskDiv.classList.remove('task-in');
        taskDiv.classList.add('task-out');
        // Чекаємо завершення анімації перед видаленням
        setTimeout(() => {
            fetch(`${API}/${id}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error('Помилка при видаленні задачі');
                    loadTodoList();
                })
                .catch(err => alert(err.message));
        }, 400); // Час має співпадати з CSS-анімацією
    }
}

// Обробник для кнопки відправки тексту до AI
$("sendToAIBtn").onclick = () => {
    const textInput = $("textToAI");
    const text = textInput.value.trim();
    if (text) {
        sendToAI(text);
        textInput.value = '';
    } else {
        alert('Будь ласка, введіть текст для AI');
    }
};

// --- Голосовий ввід ---
if (window.hasOwnProperty('webkitSpeechRecognition')) {
    const recordBtn = $('recordBtn');
    let recognition = null;
    let isRecording = false;

    recordBtn.onclick = () => {
        if (isRecording) {
            recognition.stop();
            return;
        }
        
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'uk-UA';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isRecording = true;
            recordBtn.innerHTML = '⏹️';
        };

        recognition.onresult = (event) => {
            toggleModal('record', false);
            const text = event.results[0][0].transcript;
            console.log('Розпізнаний текст:', text);
            sendToAI(text);
        };

        recognition.onerror = (event) => {
            alert('Помилка розпізнавання: ' + event.error);
        };

        recognition.onend = () => {
            isRecording = false;
            recordBtn.innerHTML = '🎤';
        };

        recognition.start();
    };
} else {
    // Якщо функція не підтримується, ховаємо кнопку
    console.log('Розпізнавання мовлення не підтримується у вашому браузері.');
    if ($('searchBarBtn')) $('searchBarBtn').style.display = 'none';
}