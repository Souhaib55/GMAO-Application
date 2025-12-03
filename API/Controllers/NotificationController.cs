using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly ILogger<NotificationController> _logger;

        public NotificationController(StoreContext context, UserManager<AppUser> userManager, ILogger<NotificationController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        // Get all notifications for the current user
        [HttpGet]
        public async Task<ActionResult<List<NotificationDto>>> GetNotifications(bool unreadOnly = false, int limit = 20)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var query = _context.Notifications
                .Where(n => n.UserId == userEntity.ID)
                .Include(n => n.Intervention)
                .Include(n => n.TriggeredByUser)
                .OrderByDescending(n => n.CreatedAt);

            if (unreadOnly)
            {
                query = (IOrderedQueryable<Notification>)query.Where(n => !n.IsRead);
            }

            var notifications = await query
                .Take(limit)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    Type = n.Type,
                    CreatedAt = n.CreatedAt,
                    IsRead = n.IsRead,
                    ReadAt = n.ReadAt,
                    InterventionId = n.InterventionId,
                    InterventionTitle = n.Intervention != null ? n.Intervention.Titre : null,
                    TriggeredBy = n.TriggeredByUser != null ? new TriggeredByUserDto
                    {
                        Id = n.TriggeredByUser.ID,
                        Nom = n.TriggeredByUser.Nom,
                        Prenom = n.TriggeredByUser.Prenom
                    } : null
                })
                .ToListAsync();

            return Ok(notifications);
        }

        // Get notification count
        [HttpGet("count")]
        public async Task<ActionResult<NotificationCountDto>> GetNotificationCount()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var unreadCount = await _context.Notifications
                .Where(n => n.UserId == userEntity.ID && !n.IsRead)
                .CountAsync();

            var totalCount = await _context.Notifications
                .Where(n => n.UserId == userEntity.ID)
                .CountAsync();

            return Ok(new NotificationCountDto
            {
                UnreadCount = unreadCount,
                TotalCount = totalCount
            });
        }

        // Mark notification as read
        [HttpPatch("{id}/read")]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userEntity.ID);

            if (notification == null) return NotFound("Notification not found");

            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification marked as read" });
        }

        // Mark all notifications as read
        [HttpPatch("read-all")]
        public async Task<ActionResult> MarkAllAsRead()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userEntity.ID && !n.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"{notifications.Count} notifications marked as read" });
        }

        // Delete a notification
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteNotification(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userEntity.ID);

            if (notification == null) return NotFound("Notification not found");

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification deleted" });
        }

        // Clear all notifications
        [HttpDelete("clear-all")]
        public async Task<ActionResult> ClearAllNotifications()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userEntity.ID)
                .ToListAsync();

            _context.Notifications.RemoveRange(notifications);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Cleared {notifications.Count} notifications for user {userEntity.ID}");

            return Ok(new { message = $"{notifications.Count} notifications deleted" });
        }

        // Internal method to create a notification (called from other controllers)
        public static async Task CreateNotificationAsync(
            StoreContext context,
            string title,
            string message,
            string type,
            int userId,
            int? triggeredByUserId = null,
            int? interventionId = null)
        {
            var notification = new Notification
            {
                Title = title,
                Message = message,
                Type = type,
                UserId = userId,
                TriggeredByUserId = triggeredByUserId,
                InterventionId = interventionId,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            context.Notifications.Add(notification);
            await context.SaveChangesAsync();
        }
    }
}
