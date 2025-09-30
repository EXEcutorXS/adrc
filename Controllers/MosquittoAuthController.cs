using adrc.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MQTTnet;
using MQTTnet.LowLevelClient;
using MQTTnet.Protocol;

namespace adrc;

public interface IMqttRetainedService
{
    Task<string> GetRetainedMessageAsync(string topic);
    Task<bool> HasRetainedMessageAsync(string topic);
}

public class MqttRetainedService : IMqttRetainedService, IDisposable
{
    private readonly IMqttClient _mqttClient;
    private readonly MqttClientOptions _options;

    public MqttRetainedService(string server = "localhost", int port = 1883)
    {
        var factory = new MqttClientFactory();
        _mqttClient = factory.CreateMqttClient();

        _options = new MqttClientOptionsBuilder()
            .WithTcpServer(server, port)
            .WithCleanSession()
            .Build();
    }

    public async Task<string> GetRetainedMessageAsync(string topic)
    {
        try
        {
            if (!_mqttClient.IsConnected)
            {
                await _mqttClient.ConnectAsync(_options);
            }

            string retainedMessage = null;
            var taskCompletionSource = new TaskCompletionSource<bool>();

            // Временный обработчик для retained сообщений
            async Task ApplicationMessageReceivedAsync(MqttApplicationMessageReceivedEventArgs e)
            {
                if (e.ApplicationMessage.Topic == topic && e.ApplicationMessage.Retain)
                {
                    retainedMessage = e.ApplicationMessage.ConvertPayloadToString();
                    _mqttClient.ApplicationMessageReceivedAsync -= ApplicationMessageReceivedAsync;
                    taskCompletionSource.SetResult(true);
                }
            }

            _mqttClient.ApplicationMessageReceivedAsync += ApplicationMessageReceivedAsync;

            // Подписываемся на топик - сервер сразу отправит retained сообщение если оно есть
            var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
                .WithTopicFilter(f => f.WithTopic(topic))
                .Build();

            await _mqttClient.SubscribeAsync(subscribeOptions);

            // Ждем retained сообщение короткое время (оно приходит сразу при подписке)
            var timeoutTask = Task.Delay(1000); // 1 секунда достаточно
            var completedTask = await Task.WhenAny(taskCompletionSource.Task, timeoutTask);

            _mqttClient.ApplicationMessageReceivedAsync -= ApplicationMessageReceivedAsync;

            if (completedTask == taskCompletionSource.Task)
            {
                return retainedMessage;
            }

            return null; // Retained сообщение не найдено
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting retained message: {ex.Message}");
            return null;
        }
    }

    public async Task<bool> HasRetainedMessageAsync(string topic)
    {
        var message = await GetRetainedMessageAsync(topic);
        return message != null;
    }

    public void Dispose()
    {
        _mqttClient?.DisconnectAsync();
        _mqttClient?.Dispose();
    }
}

[ApiController]
[Route("mqtt")]
public class MosquitoAuthController : ControllerBase
{

    private readonly IConfiguration _configuration;
    private readonly ILogger<MosquitoAuthController> _logger;
    private readonly SignInManager<IdentityUser> _signInManager;
    private readonly UserManager<IdentityUser> _userManager;
    public MosquitoAuthController(SignInManager<IdentityUser> signInManager,
                         UserManager<IdentityUser> userManager, ILogger<MosquitoAuthController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _signInManager = signInManager;
        _userManager = userManager;
        _configuration = configuration;
    }

    [HttpPost("auth")]
    public async Task<IActionResult> Authenticate([FromBody] MqttAuthRequest request)
    {
        try
        {
            _logger.LogInformation($"Auth request for user: {request.Username}");


            var response = new MqttAuthResponse
            {
                Ok = false,
                Error = ""
            };

            if (request.Username == _configuration["ServiceLogin:Login"] && request.Password == _configuration["ServiceLogin:Password"])
            {
                response.Ok = true;
            }
            var user = await _userManager.FindByNameAsync(request.Username);

            if (user == null)
            {
                _logger.LogInformation($"User: {request.Username} not found");
                response.Error = "User not found";
                return NotFound(response);
            }

            response.Ok = (await _signInManager.CheckPasswordSignInAsync(user, request.Password, false)).Succeeded;

            if (!response.Ok)
            {
                response.Error = "Invalid password";
                _logger.LogInformation($"Invalid password for user: {request.Username}");
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication error");
            return StatusCode(500, new { result = false });
        }
    }
}