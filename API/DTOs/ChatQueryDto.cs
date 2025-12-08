using System.Text.Json.Serialization;

namespace API.DTOs
{
    public class ChatQueryDto
    {
        [JsonPropertyName("query")]
        public string Query { get; set; } = string.Empty;
        
        [JsonPropertyName("conversationHistory")]
        public MessageDto[]? ConversationHistory { get; set; } = null;
    }
    
    public class MessageDto
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;
        
        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }
}