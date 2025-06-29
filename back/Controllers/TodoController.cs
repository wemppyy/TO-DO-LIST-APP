using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

[ApiController]
[Route("[controller]")]
public class TodoController : ControllerBase
{
    private static List<TodoItem> InMemoryTodos = new List<TodoItem>();

    [HttpGet]
    public IActionResult GetTodoList()
    {
        return Ok(InMemoryTodos);
    }

    [HttpPost]
    public IActionResult AddTodo([FromBody] TodoItem item)
    {
        Console.WriteLine($"Received todo item: {item.Title}, Description: {item.Description}, CompleteTime: {item.CompleteTime}");

        int newId = InMemoryTodos.Count > 0 ? InMemoryTodos.Max(t => t.Id) + 1 : 1;
        item.Id = newId;

        InMemoryTodos.Add(item);
        Console.WriteLine($"Added todo item: {item.Title}, ID: {item.Id}");
        return Ok(item);
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteTodo(int id)
    {
        Console.WriteLine($"Attempting to delete todo item with ID: {id}");
        var item = InMemoryTodos.FirstOrDefault(t => t.Id == id);
        if (item == null) return NotFound();
        InMemoryTodos.Remove(item);
        Console.WriteLine($"Deleted todo item: {item.Title}, ID: {item.Id}");
        return NoContent();
    }

    [HttpPost("delete-all")]
    public IActionResult DeleteAllTodos()
    {
        InMemoryTodos.Clear();
        return NoContent();
    }

    [HttpPost("ai-process")]
    public async Task<IActionResult> SendToAI([FromBody] string text)
        {
            Console.WriteLine($"Received text for AI processing: {text}");
        string url = "http://localhost:11434";
        var ollama = new OllamaSharp.OllamaApiClient(url)
        {
            SelectedModel = "gemma3:4b"
        };

        string systemPrompt = "You are a highly accurate planner assistant. Your only task is to analyze the user's input and generate a STRICTLY FORMATTED JSON object describing a task. Respond with ONLY the valid JSON. No extra text, comments, or explanations. === RESPONSE FORMAT === { \"title\": \"<Concise action summary>\", \"datetime\": \"YYYY-MM-DD HH:MM\", \"description\": \"<Full context or user intention>\" } === RULES === - Language is Ukrainian. - If no time is mentioned, default to 09:00. - If no date is mentioned, assume the task is for tomorrow. - Extract the core intent or action as the title (short, up to ~10 words). - Use the rest of the input — any explanations, time/place/reasoning — as the description. - If the input is a short single-phrase task (e.g., 'Buy milk'), use that as both title and description. - Always assume the user wants to create a task. Never ask for clarification.";

        var chat = new OllamaSharp.Chat(ollama, systemPrompt: systemPrompt);

        var responseBuilder = new System.Text.StringBuilder();
        await foreach (var token in chat.SendAsync(text))
        {
            responseBuilder.Append(token);
        }

        var result = responseBuilder.ToString().Trim();

        // Попытка найти первую и последнюю фигурную скобку для извлечения JSON
        int start = result.IndexOf('{');
        int end = result.LastIndexOf('}');
        if (start == -1 || end == -1 || end <= start)
        {
            return BadRequest("AI did not return a valid JSON object.");
        }
        string json = result.Substring(start, end - start + 1);

        // Десериализация строго в объект
        try
        {
            var jsonDoc = JsonDocument.Parse(json);
            var root = jsonDoc.RootElement;
            var title = root.GetProperty("title").GetString() ?? "No title provided";
            var description = root.GetProperty("description").GetString() ?? "No description provided";
            var datetimeStr = root.TryGetProperty("datetime", out var dtProp) ? dtProp.GetString() : null;
            DateTime completeTime;
            if (!DateTime.TryParse(datetimeStr, out completeTime))
            {
                completeTime = DateTime.Now.AddDays(1).Date.AddHours(9); // default 09:00 tomorrow
            }

            TodoItem todoItem = new TodoItem
            {
                Id = InMemoryTodos.Count > 0 ? InMemoryTodos.Max(t => t.Id) + 1 : 1,
                Title = title,
                Description = description,
                CompleteTime = completeTime,
                IsCompleted = false
            };
            InMemoryTodos.Add(todoItem);
            Console.WriteLine($"Added todo: {todoItem.Title} at {todoItem.CompleteTime}");
            Console.WriteLine($"Description: {todoItem.Description}");
            return Ok(todoItem);
        }
        catch (Exception ex)
        {
            return BadRequest($"Invalid JSON response from AI: {ex.Message}\nRaw: {result}");
        }
    }
}