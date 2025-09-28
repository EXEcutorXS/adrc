using adrc.Models;

namespace adrc.DTOs
{
    public class AuthResponse
    {
        public string Token { get; set; }
        public DateTime Expiration { get; set; }
        public UserProfile User { get; set; }
    }
}