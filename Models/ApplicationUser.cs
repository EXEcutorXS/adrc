using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace adrc.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [MaxLength(10)]
        public string TemperatureFormat { get; set; } = "Celsius"; // Celsius, Fahrenheit

        [Required]
        [MaxLength(10)]
        public string TimeFormat { get; set; } = "24h"; // 24h, 12h

        [Required]
        [MaxLength(50)]
        public string TimeZone { get; set; } = "UTC";
    }

    public class RegisterModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; }

        [Required]
        public string TemperatureFormat { get; set; } = "Celsius";

        [Required]
        public string TimeFormat { get; set; } = "24h";

        [Required]
        public string TimeZone { get; set; } = "UTC";
    }

    public class LoginModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class UserProfile
    {
        public string Email { get; set; }
        public string TemperatureFormat { get; set; }
        public string TimeFormat { get; set; }
        public string TimeZone { get; set; }
    }

    public class UserProfileUpdate
    {
        public string TemperatureFormat { get; set; }
        public string TimeFormat { get; set; }
        public string TimeZone { get; set; }
    }
}