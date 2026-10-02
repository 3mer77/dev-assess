using System.ComponentModel.DataAnnotations;

namespace DevAssess.Api.Dtos.Auth
{
    public class RegisterRequest 
    {
        [Required]
        [MaxLength(100)]
        [MinLength(4)]
        public string DisplayName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(8)]
        public string Password { get; set; }

    }
}
