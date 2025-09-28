using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using adrc.Models;

namespace adrc.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Конфигурация дополнительных полей пользователя
            builder.Entity<ApplicationUser>(b =>
            {
                b.Property(u => u.TemperatureFormat)
                    .HasMaxLength(10)
                    .HasDefaultValue("Celsius");

                b.Property(u => u.TimeFormat)
                    .HasMaxLength(10)
                    .HasDefaultValue("24h");

                b.Property(u => u.TimeZone)
                    .HasMaxLength(50)
                    .HasDefaultValue("UTC");
            });
        }
    }
}