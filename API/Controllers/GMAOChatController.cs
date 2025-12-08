using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using API.DTOs;
using System.Collections.Generic;
using System.Threading;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace API.Controllers
{
    [ApiController]
    [Route("api/gmao-chat")]
    public class GMAOChatController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly string _pythonServiceUrl;
        private readonly TimeSpan _requestTimeout = TimeSpan.FromSeconds(1000); // Augmentation du timeout
        private readonly ILogger<GMAOChatController> _logger;
        private bool _pythonServiceAvailable = true;

        public GMAOChatController(IConfiguration configuration, ILogger<GMAOChatController> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = new HttpClient();
            _httpClient.Timeout = _requestTimeout;
            _pythonServiceUrl = _configuration["ChatbotService:Url"] ?? "http://localhost:5002";
            _logger.LogInformation($"GMAO Chat initialized with Python service URL: {_pythonServiceUrl}");
        }

        [HttpGet("test")]
        public async Task<IActionResult> TestEndpoint()
        {
            try
            {
                var localApiStatus = new { message = "GMAO Chat API is working!" };
                
                if (_pythonServiceAvailable)
                {
                    try
                    {
                        _logger.LogInformation($"Testing Python service at: {_pythonServiceUrl}/test");
                        using var cts = new CancellationTokenSource(_requestTimeout);
                        var pythonResponse = await _httpClient.GetAsync($"{_pythonServiceUrl}/test", cts.Token);
                        
                        if (pythonResponse.IsSuccessStatusCode)
                        {
                            var responseContent = await pythonResponse.Content.ReadAsStringAsync();
                            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            var pythonStatus = JsonSerializer.Deserialize<object>(responseContent, options);
                            _pythonServiceAvailable = true;
                            _logger.LogInformation("Python service is available");
                            return Ok(new { apiStatus = localApiStatus, pythonService = pythonStatus });
                        }
                        
                        _pythonServiceAvailable = false;
                        _logger.LogWarning($"Python service returned status code: {pythonResponse.StatusCode}");
                        return Ok(new { 
                            apiStatus = localApiStatus, 
                            pythonService = new { 
                                message = "Python service not responding", 
                                status = pythonResponse.StatusCode.ToString(),
                                help = "Make sure the Python service is running at " + _pythonServiceUrl
                            }
                        });
                    }
                    catch (TaskCanceledException)
                    {
                        _pythonServiceAvailable = false;
                        _logger.LogWarning("Python service test timed out");
                        return Ok(new { 
                            apiStatus = localApiStatus, 
                            pythonService = new { 
                                message = "Python service not available - request timed out", 
                                error = "Connection timed out. Is the Python service running?",
                                help = "Start the Python service at " + _pythonServiceUrl
                            }
                        });
                    }
                    catch (HttpRequestException ex)
                    {
                        _pythonServiceAvailable = false;
                        _logger.LogWarning($"Python service connection error: {ex.Message}");
                        return Ok(new { 
                            apiStatus = localApiStatus, 
                            pythonService = new { 
                                message = "Python service not available - connection error", 
                                error = ex.Message,
                                help = "Ensure the Python service is running at " + _pythonServiceUrl
                            }
                        });
                    }
                }
                else
                {
                    // Try to reconnect if previously marked as unavailable
                    try {
                        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                        var pythonResponse = await _httpClient.GetAsync($"{_pythonServiceUrl}/test", cts.Token);
                        if (pythonResponse.IsSuccessStatusCode) {
                            _pythonServiceAvailable = true;
                            var responseContent = await pythonResponse.Content.ReadAsStringAsync();
                            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            var pythonStatus = JsonSerializer.Deserialize<object>(responseContent, options);
                            _logger.LogInformation("Python service reconnection successful");
                            return Ok(new { apiStatus = localApiStatus, pythonService = pythonStatus });
                        }
                    } catch {
                        // Ignore reconnection errors
                    }
                    
                    _logger.LogInformation("Python service marked as unavailable, skipping test");
                    return Ok(new {
                        apiStatus = localApiStatus,
                        pythonService = new {
                            message = "Python service marked as unavailable",
                            info = "Previous connections failed. Service will be rechecked periodically."
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in TestEndpoint: {ex}");
                return Ok(new { 
                    apiStatus = new { message = "GMAO Chat API encountered an error", error = ex.Message }, 
                    pythonService = new { message = "Status unknown due to API error" }
                });
            }
        }

        [HttpPost("query")]
        public async Task<IActionResult> QueryAI([FromBody] ChatQueryDto query)
        {
            _logger.LogInformation($"QueryAI called. Query object is null: {query == null}");
            
            if (query == null)
            {
                _logger.LogWarning("Query object is null");
                return BadRequest(new { response = "Requête invalide. Le corps de la requête est vide." });
            }
            
            _logger.LogInformation($"Query value: '{query.Query}'");
            
            if (string.IsNullOrEmpty(query.Query))
            {
                _logger.LogWarning("Query string is null or empty");
                return BadRequest(new { response = "Veuillez fournir une question valide." });
            }

            try
            {
                string responseText = null;
                var metadata = new Dictionary<string, object>();

                if (_pythonServiceAvailable)
                {
                    try
                    {
                        _logger.LogInformation($"Sending query to Python service: '{query.Query}'");
                        // Convert conversation history to a list of objects with role and content
                        var history = query.ConversationHistory?.Select(msg => new Dictionary<string, string>
                        {
                            { "role", msg.Role },
                            { "content", msg.Content }
                        }).ToList() ?? new List<Dictionary<string, string>>();

                        // Prepare request payload
                        var requestPayload = new
                        {
                            query = query.Query,
                            conversation_history = history
                        };

                        var requestJson = JsonSerializer.Serialize(requestPayload);
                        _logger.LogDebug($"Request JSON: {requestJson}");
                        
                        var requestContent = new StringContent(
                            requestJson,
                            Encoding.UTF8,
                            "application/json"
                        );

                        using var cts = new CancellationTokenSource(_requestTimeout);
                        var response = await _httpClient.PostAsync($"{_pythonServiceUrl}/query", requestContent, cts.Token);
                        
                        if (response.IsSuccessStatusCode)
                        {
                            var responseContent = await response.Content.ReadAsStringAsync();
                            _logger.LogDebug($"Python service response: {responseContent}");
                            
                            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            var pythonResponse = JsonSerializer.Deserialize<PythonServiceResponse>(responseContent, options);
                            responseText = pythonResponse?.Response;
                            metadata = pythonResponse?.Metadata ?? new Dictionary<string, object>();
                            _pythonServiceAvailable = true;
                            _logger.LogInformation("Python service query successful");
                        }
                        else
                        {
                            var errorContent = await response.Content.ReadAsStringAsync();
                            _logger.LogWarning($"Python service error: {response.StatusCode}, {errorContent}");
                            _pythonServiceAvailable = response.StatusCode != System.Net.HttpStatusCode.InternalServerError; // Only mark unavailable for server errors
                            metadata.Add("python_error", errorContent);
                            metadata.Add("status_code", (int)response.StatusCode);
                        }
                    }
                    catch (TaskCanceledException)
                    {
                        _pythonServiceAvailable = false;
                        _logger.LogWarning("Python service request timed out");
                        metadata.Add("error", "Python service request timed out");
                    }
                    catch (HttpRequestException ex)
                    {
                        _pythonServiceAvailable = false;
                        _logger.LogWarning($"HTTP request error: {ex.Message}");
                        metadata.Add("error", $"HTTP request error: {ex.Message}");
                    }
                }

                if (string.IsNullOrEmpty(responseText))
                {
                    _logger.LogInformation("Using fallback response");
                    if (metadata.ContainsKey("error"))
                    {
                        responseText = $"Je suis désolé, le service de chat a rencontré une erreur: {metadata["error"]}";
                    }
                    else
                    {
                        responseText = "Je suis désolé, le service de chat n'est pas disponible pour le moment. Veuillez vérifier que le service Python fonctionne correctement.";
                    }
                    metadata.Add("using_fallback", true);
                }

                metadata.Add("response_source", _pythonServiceAvailable ? "python_service" : "fallback");
                metadata.Add("timestamp", DateTime.UtcNow.ToString("o"));
                return Ok(new { response = responseText, metadata });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in QueryAI: {ex}");
                return Ok(new { 
                    response = $"Une erreur s'est produite lors du traitement de votre demande: {ex.Message}",
                    metadata = new { error = ex.Message, stack = ex.StackTrace }
                });
            }
        }

        public class PythonServiceResponse
        {
            public string Response { get; set; }
            public Dictionary<string, object> Metadata { get; set; }
        }
    }
}