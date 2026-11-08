using System.Diagnostics.CodeAnalysis;
using Markdig;
using Markdig.Extensions.Yaml;
using Markdig.Syntax;
using Microsoft.Extensions.Options;
using YamlDotNet.Serialization.NamingConventions;
using IYamlDeserializer = YamlDotNet.Serialization.IDeserializer;
using YamlDeserializerBuilder = YamlDotNet.Serialization.DeserializerBuilder;

namespace ScuroGuardiano.Net.Blog.Services;

public class MarkdownParser
{
    private readonly IOptionsMonitor<MarkdownParserOptions> _options;
    private static readonly byte[] FrontMatterDelimiter = "---"u8.ToArray();

    private static readonly MarkdownPipeline IndexPipeline = new MarkdownPipelineBuilder()
        .UseYamlFrontMatter()
        .Build();

    private static readonly MarkdownPipeline RenderPipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .UseYamlFrontMatter()
        .Build();

    private static readonly IYamlDeserializer YamlDeserializer = new YamlDeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .Build();

    public MarkdownParser(IOptionsMonitor<MarkdownParserOptions> options)
    {
        _options = options;
    }

    public T? DeserializeFrontMatter<T>([StringSyntax("Markdown")] string markdownText)
        where T : class
    {
        // TODO: we may think about optimizing that
        var markdownDocument = Markdown.Parse(markdownText, IndexPipeline);
        var yamlBlock = markdownDocument
            .Descendants<YamlFrontMatterBlock>()
            .FirstOrDefault();

        if (yamlBlock is null)
        {
            return null;
        }

        var yamlText = yamlBlock.Lines.ToString();
        return YamlDeserializer.Deserialize<T>(yamlText);
    }
}
