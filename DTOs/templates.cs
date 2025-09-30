using System.Text.Json.Serialization;

namespace adrc.DTOs;
public class MqttAuthRequest
{
    [JsonPropertyName("username")]
    public string Username { get; set; }

    [JsonPropertyName("password")]
    public string Password { get; set; }

    [JsonPropertyName("clientid")]
    public string ClientId { get; set; }

    [JsonPropertyName("topic")]
    public string Topic { get; set; }

    [JsonPropertyName("acc")]
    public int Acc { get; set; }
}

public class MqttAuthResponse
{
    [JsonPropertyName("Ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("Error")]
    public string Error { get; set; }
}

public class FoundDevice
{
    public long LastSeen { get; set; }
    public string DeviceType { get; set; }
}
public class GetDeviceListResponse
{
    public GetDeviceListResponse()
    {
        Devices = new List<FoundDevice>();
    }
    List<FoundDevice> Devices { get; set; }
}


