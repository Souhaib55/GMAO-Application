namespace API.DTOs
{
    public class ChatQueryDto
    {
        public string Query { get; set; }
        public MessageDto[] ConversationHistory { get; set; }
    }
    
    public class MessageDto
    {
        public string Role { get; set; }
        public string Content { get; set; }
    }
}