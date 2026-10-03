namespace DevAssess.Api.Dtos.Auth
{
    public class RefreshTokenResult
    {

        public int TokenId { get; set; }
        public string RawToken { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }
    }
}
