#include <iostream>
#include <fstream>
#include <string>
#include <map>
#include <vector>
#include <sstream>

bool isWhitespace(char c)
{
	return c == ' ' || c == '\n' || c == '\r' || c == '\t';
}

char toUpper(char c)
{
	if (c >= 'a' && c <= 'z')
		return c + 'A'-'a';
	else
		return c;
}

char toLower(char c)
{
	if (c >= 'A' && c <= 'Z')
		return c + 'a'-'A';
	else
		return c;
}

int main(int argc, char* argv[])
{
	std::string ifile = "C:\\Users\\Brian\\Documents\\Programming\\Projects\\In Progress\\HTML5 Random Words\\data_raw\\name_eternity.txt";
	std::ifstream file = std::ifstream(ifile);
	std::ofstream outfile;
	outfile.open("out.txt");
	std::ofstream filterfile;
	filterfile.open("filtered.txt");
	int mode = 0; //0: markov letters, 1: markov words
	int order = 2;
	bool filter = false;

	char endToken[2] = { (char)3, (char)0 };

	std::map<std::string, std::map<std::string, int>> chain;

	int minlen = INT_MAX;
	int maxlen = INT_MIN;

	if (file.is_open() && outfile.is_open())
	{
		std::string line;
		while (std::getline(file, line))
		{
			int tokens = 0;

			//Filtering on 'line'
			if (filter)
			{
				for (int c = 0; c < line.length(); c++)
				{
					if (c > 0)
						line[c] = toLower(line[c]);
					if (isWhitespace(line[c]))
					{
						line = line.substr(0, c);
						break;
					}
				}
			}

			filterfile << line << std::endl;

			//Process line into data structures
			std::vector<std::string> precedingTokens;
			for (int c = 0; c < line.length() + 1;)
			{
				std::string token;
				if (c == line.length())
				{
					token = std::string(endToken);
					c++;
				}
				else
				{
					if (mode == 0)
					{
						//Characters
						token = line.substr(c, 1);
						tokens++;
						c++;
					}
					else
					{
						//Words
						//Find word end
						int wdend = c;
						for (; wdend < line.length() && !isWhitespace(line[wdend]); wdend++) { }
						//Extract word
						token = line.substr(c, wdend-c);
						//Seek to next word start
						for (c = wdend; c < line.length() && isWhitespace(line[c]); c++) { }
						tokens++;
					}
				}

				//Build preceding
				std::string preceding;
				for (int d = 0; d < order && d < precedingTokens.size(); d++)
				{
					if (mode == 1 && d > 0)
						preceding = " " + preceding;
					preceding = precedingTokens[precedingTokens.size()-d-1] + preceding;
				}

				//Add token to data
				chain[preceding][token]++;

				precedingTokens.push_back(token);
			}

			if (tokens > maxlen) maxlen = tokens;
			if (tokens < minlen) minlen = tokens;
		}

		file.close();
		filterfile.close();

		//Remove starters that only provide one path to end
		std::vector<std::string> kill;
		for (auto it = chain[""].begin(); it != chain[""].end(); it++)
		{
			//HACK: infinite loop possible
			for (std::map<std::string, int> it2 = chain[it->first]; it2.size() == 1; it2 = chain[it2.begin()->first])
			{
				if (it2.size() <= 1 && it2.begin()->first == endToken)
				{
					kill.push_back(it->first);
					break;
				}
			}
		}
		for (auto it = kill.begin(); it != kill.end(); it++)
			chain[""].erase(*it);

		std::string garbage;
		std::cout << (kill.size());
		std::cin >> garbage;

		//Write output
		outfile << mode << std::endl;
		outfile << "Generator Title" << std::endl;
		outfile << "Generator description." << std::endl;
		outfile << order << std::endl;
		outfile << minlen << std::endl;
		outfile << maxlen << std::endl;

		outfile << chain.size() << std::endl;
		for (auto it = chain.begin(); it != chain.end(); it++)
		{
			outfile << it->first << std::endl;
			outfile << it->second.size() << std::endl;
			for (auto it2 = it->second.begin(); it2 != it->second.end(); it2++)
			{
				outfile << it2->first << std::endl;
				outfile << it2->second << std::endl;
			}
		}

		outfile.close();
	}
	else
	{
		if (!file.is_open())
			std::cout << "Error reading file." << std::endl;
		else if (!outfile.is_open())
			std::cout << "Error writing file." << std::endl;
	}
}
