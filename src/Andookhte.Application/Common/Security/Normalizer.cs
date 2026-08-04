using System.Text.RegularExpressions;

namespace Andookhte.Application.Common.Security;

/// <summary>
/// نرمال‌سازی ورودی‌های هویتی. چون ایمیل و موبایل کلید یکتای ورود هستند،
/// باید پیش از ذخیره و پیش از جست‌وجو دقیقاً یکسان نرمال شوند.
/// </summary>
public static class Normalizer
{
    private static readonly Regex EmailPattern =
        new(@"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    /// <summary>حذف فاصله و تبدیل به حروف کوچک.</summary>
    public static string? Email(string? value)
    {
        var text = value?.Trim().ToLowerInvariant();
        return string.IsNullOrEmpty(text) ? null : text;
    }

    public static bool IsValidEmail(string? value)
    {
        var email = Email(value);
        return email is not null && EmailPattern.IsMatch(email);
    }

    /// <summary>
    /// تبدیل ارقام فارسی و عربی به لاتین و یکسان‌سازی قالب‌های 0912…، +98912…، 0098912… به 0912…
    /// </summary>
    public static string? Phone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var digits = new string(ToLatinDigits(value).Where(char.IsDigit).ToArray());
        if (digits.Length == 0) return null;

        if (digits.StartsWith("0098", StringComparison.Ordinal))
            digits = digits[4..];
        else if (digits.Length == 12 && digits.StartsWith("98", StringComparison.Ordinal))
            digits = digits[2..];

        if (digits.Length == 10 && digits[0] == '9')
            digits = "0" + digits;

        return digits;
    }

    public static bool IsValidIranianMobile(string? value)
    {
        var phone = Phone(value);
        return phone is { Length: 11 } && phone.StartsWith("09", StringComparison.Ordinal);
    }

    /// <summary>تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به لاتین.</summary>
    public static string ToLatinDigits(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;

        var buffer = new char[input.Length];

        for (var i = 0; i < input.Length; i++)
        {
            var c = input[i];
            buffer[i] = c switch
            {
                >= '۰' and <= '۹' => (char)(c - '۰' + '0'), // ارقام فارسی
                >= '٠' and <= '٩' => (char)(c - '٠' + '0'), // ارقام عربی
                _ => c
            };
        }

        return new string(buffer);
    }
}
