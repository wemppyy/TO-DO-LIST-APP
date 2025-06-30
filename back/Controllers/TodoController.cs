using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

[ApiController]
[Route("[controller]")]
public class TodoController : ControllerBase
{
    // Статичний список для зберігання завдань (імітація бази даних)
    private static readonly List<TodoItem> _inMemoryTodos = new List<TodoItem>();
    private readonly IConfiguration _configuration;

    public TodoController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    // Отримати список всіх завдань
    [HttpGet]
    public IActionResult GetTodoList()
    {
        return Ok(_inMemoryTodos);
    }

    // Додати нове завдання
    [HttpPost]
    public IActionResult AddTodo([FromBody] TodoItem item)
    {
        item.Id = _inMemoryTodos.Any() ? _inMemoryTodos.Max(t => t.Id) + 1 : 1;
        _inMemoryTodos.Add(item);
        Console.WriteLine($"Додано завдання: {item.Title}, ID: {item.Id}");
        return Ok(item);
    }

    // Видалити завдання за Id
    [HttpDelete("{id}")]
    public IActionResult DeleteTodo(int id)
    {
        var item = _inMemoryTodos.FirstOrDefault(t => t.Id == id);
        if (item == null)
        {
            return NotFound();
        }
        _inMemoryTodos.Remove(item);
        Console.WriteLine($"Видалено завдання: {item.Title}, ID: {item.Id}");
        return NoContent();
    }

    // Видалити всі завдання
    [HttpPost("delete-all")]
    public IActionResult DeleteAllTodos()
    {
        _inMemoryTodos.Clear();
        return NoContent();
    }

    // Обробка тексту через AI для створення завдання
    [HttpPost("ai-process")]
    public async Task<IActionResult> ProcessWithAI([FromBody] string text)
    {
        var ollamaUrl = _configuration["Ollama:Url"];
        var ollamaModel = _configuration["Ollama:Model"];

        if (string.IsNullOrEmpty(ollamaUrl) || string.IsNullOrEmpty(ollamaModel))
        {
            return BadRequest("Налаштування Ollama не вказані в appsettings.json");
        }

        var ollama = new OllamaSharp.OllamaApiClient(ollamaUrl)
        {
            SelectedModel = ollamaModel
        };

        // Системний промпт для AI: пояснення формату та правил генерації JSON
        const string systemPrompt = "You are a highly accurate planner assistant. Your only task is to analyze the user's input and generate a STRICTLY FORMATTED JSON object describing a task. Respond with ONLY the valid JSON. No extra text, comments, or explanations. === RESPONSE FORMAT === { \"title\": \"<Concise action summary>\", \"datetime\": \"YYYY-MM-DD HH:MM\", \"description\": \"<Full context or user intention>\" } === RULES === - Language is Ukrainian. - If no time is mentioned, default to 09:00. - If no date is mentioned, assume the task is for tomorrow. - Extract the core intent or action as the title (short, up to ~10 words). - Use the rest of the input — any explanations, time/place/reasoning — as the description. - If the input is a short single-phrase task (e.g., 'Buy milk'), use that as both title and description. - Always assume the user wants to create a task. Never ask for clarification.";

        var chat = new OllamaSharp.Chat(ollama, systemPrompt: systemPrompt);

        var responseBuilder = new StringBuilder();
        await foreach (var token in chat.SendAsync(text))
        {
            responseBuilder.Append(token);
        }

        var result = responseBuilder.ToString().Trim();

        // Спроба виділити JSON з відповіді AI
        int start = result.IndexOf('{');
        int end = result.LastIndexOf('}');
        if (start == -1 || end == -1 || end <= start)
        {
            return BadRequest("AI не повернув коректний JSON об'єкт.");
        }
        string json = result.Substring(start, end - start + 1);

        try
        {
            var jsonDoc = JsonDocument.Parse(json);
            var root = jsonDoc.RootElement;

            var title = root.GetProperty("title").GetString() ?? "Без назви";
            var description = root.GetProperty("description").GetString() ?? "Без опису";
            var datetimeStr = root.TryGetProperty("datetime", out var dtProp) ? dtProp.GetString() : null;

            if (!DateTime.TryParse(datetimeStr, out var completeTime))
            {
                completeTime = DateTime.Now.AddDays(1).Date.AddHours(9); // За замовчуванням: завтра о 09:00
            }

            var todoItem = new TodoItem
            {
                Id = _inMemoryTodos.Any() ? _inMemoryTodos.Max(t => t.Id) + 1 : 1,
                Title = title,
                Description = description,
                CompleteTime = completeTime,
                IsCompleted = false
            };

            _inMemoryTodos.Add(todoItem);
            Console.WriteLine($"Додано завдання через AI: {todoItem.Title}, ID: {todoItem.Id}");
            return Ok(todoItem);
        }
        catch (JsonException ex)
        {
            return BadRequest($"Помилка розбору JSON від AI: {ex.Message}\nОтримана відповідь: {result}");
        }
    }
}