namespace DevAssess.Api.Dtos.Auth
{
    public class UserResponse
    {
        public string Id { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public bool EmailConfirmed { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
