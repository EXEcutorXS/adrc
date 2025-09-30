using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace adrc.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        public bool UseFarenheit { get; set; } = false; // Celsius, Fahrenheit

        [Required]
        public bool Use12HoutFormat { get; set; } = false; // 24h, 12h

        [Required]
        [MaxLength(30)]
        public string TimeZone { get; set; } = "UTC";

        [Required]
        [MaxLength(10)]
        public string Language { get; set; } = "en";
    }

    public class RegisterModel
    {
        [Required]
        public string UserName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; }

        [Required]
        public bool UseFarenheit { get; set; } = false;

        [Required]
        public bool Use12HourFormat { get; set; } = false;

        [Required]
        public string TimeZone { get; set; } = "UTC";

        public string Language { get; set; } = "en";
    }

    public class LoginModel
    {
        [Required]
        public string Login { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class UserProfile
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public bool UseFarenheit { get; set; }
        public bool Use12HourFormat { get; set; }
        public string TimeZone { get; set; }
        public string Language { get; set; }
    }

    public class UserProfileUpdate
    {
        public bool UseFarenheit { get; set; }
        public bool Use12HourFormat { get; set; }
        public string TimeZone { get; set; }
        public string Language { get; set; }
    }
}