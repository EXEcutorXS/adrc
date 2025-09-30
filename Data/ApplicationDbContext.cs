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
                b.Property(u => u.UseFarenheit)
                    .HasDefaultValue(false);

                b.Property(u => u.Use12HoutFormat)
                    .HasDefaultValue(false);

                b.Property(u => u.TimeZone)
                    .HasMaxLength(50)
                    .HasDefaultValue("UTC");
            });
        }
    }
}