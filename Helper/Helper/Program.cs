using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

public static class Program
{
	static void Main(string[] args)
	{
		File.WriteAllLines(
			@"E:\Projects\RandomWords\data\include\mainewords.txt",
			ExpandSynonyms(File.ReadAllLines(@"E:\Projects\RandomWords\data_raw\title_gardengame.txt", Encoding.UTF8)),
			Encoding.UTF8);
		/*File.WriteAllLines(
			@"E:\Projects\RandomWords\data\title\videogame-template.txt",
			ProducePartOfSpeechTemplates(File.ReadAllLines(@"E:\Projects\RandomWords\data_raw\title_videogame.txt", Encoding.UTF8)),
			Encoding.UTF8);*/
	}

	private static List<string> ExpandSynonyms(IList<string> source)
	{
		HashSet<string> maybe = new HashSet<string>();
		HashSet<string> maybe2 = new HashSet<string>();
		HashSet<string> maybe3 = new HashSet<string>();
		HashSet<string> results = new HashSet<string>();

		string[] thesaurus = File.ReadAllLines(@"E:\Resources\thesaurus.txt");
		Dictionary<string, List<string>> mapped = new Dictionary<string, List<string>>();
		foreach (string row in thesaurus)
		{
			string[] split = row.Split(',');
			List<string> synonyms = new List<string>();
			for (int i = 1; i < split.Length; i++)
			{
				synonyms.Add(split[i]);
			}
			mapped[split[0]] = synonyms;
		}

		foreach (string sr in source)
		{
			results.Add(sr);
			List<string> synonyms;
			if (mapped.TryGetValue(sr, out synonyms))
			{
				foreach (string synonym in synonyms)
				{
					if (!maybe.Add(synonym))
					{
						if (!maybe2.Add(synonym))
						{
							if (!maybe3.Add(synonym))
							{
								results.Add(synonym);
							}
						}
					}
				}
			}
		}

		return results.ToList();
	}

	private static List<string> ProducePartOfSpeechTemplates(IList<string> source)
	{
		HashSet<string> common = new HashSet<string>();
		common.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\prepositions.txt"));
		common.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\conjunctions.txt"));
		common.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\pronouns.txt"));

		HashSet<string> nouns = new HashSet<string>();
		nouns.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\nouns.txt"));

		HashSet<string> verbs = new HashSet<string>();
		verbs.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\verbs.txt"));

		HashSet<string> adjectives = new HashSet<string>();
		adjectives.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\adjectives.txt"));

		HashSet<string> adverbs = new HashSet<string>();
		adverbs.AddRange(File.ReadAllLines(@"E:\Resources\dictionaries\english\adverbs.txt"));

		HashSet<string> results = new HashSet<string>();

		foreach (string sr in source)
		{
			string line = sr;
			line = line.Replace(".", "");
			line = line.Replace("'", "");
			line = line.Replace("/", "");
			line = line.Replace(";", "");
			line = line.Replace("-", "");
			line = line.Replace("@", "");
			line = line.Replace("^", "");
			line = line.Replace("+", "");
			line = line.Replace("#", "");

			// collapse whitespace
			line = line.Replace("  ", " ");
			line = line.Replace("  ", " ");
			line = line.Replace("  ", " ");

			List<string> parts = new List<string>();
			bool wasWord = char.IsLetterOrDigit(line[0]);
			int wordstart = 0;
			for (int i = 1; i < line.Length; i++)
			{
				bool isWord = char.IsLetterOrDigit(line[i]);
				if (isWord != wasWord)
				{
					parts.Add(line.Substring(wordstart, i - wordstart));
					wordstart = i;
					wasWord = isWord;
				}
			}
			parts.Add(line.Substring(wordstart, line.Length - wordstart));

			if (parts.Count > 4)
			{
				continue;
			}

			bool failed = false;
			for (int i = 0; i < parts.Count; i++)
			{
				if (!char.IsLetterOrDigit(parts[i][0]))
				{
					// keep punctuation
				}
				else if (nouns.Contains(parts[i]))
				{
					parts[i] = "{{noun}}";
				}
				else if (adverbs.Contains(parts[i]))
				{
					parts[i] = "{{adverb}}";
				}
				else if (adjectives.Contains(parts[i]))
				{
					parts[i] = "{{adjective}}";
				}
				else if (verbs.Contains(parts[i]))
				{
					parts[i] = "{{verb}}";
				}
				else if (common.Contains(parts[i]))
				{
					// keep common words
				}
				else
				{
					parts[i] = "{{noun}}";
					// failed
					//failed = true;
					//break;
				}
			}
			if (failed)
			{
				continue;
			}

			results.Add(string.Join("", parts));
		}

		return results.ToList();
	}

	public static void AddRange<T>(this HashSet<T> hashSet, IEnumerable<T> collection)
	{
		foreach (T item in collection)
		{
			hashSet.Add(item);
		}
	}
}
