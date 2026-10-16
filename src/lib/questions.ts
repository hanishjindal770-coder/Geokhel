// The question bank. Server-only: answers must never reach the browser before a guess.
import { rng } from "./daily.ts";

export type Sport = string;

export interface Question {
  clue: string;
  answer: string;
  lat: number;
  lon: number;
  sport: Sport;
  /** 1 = easy, 3 = hard. Daily rounds run easy to hard. */
  difficulty: 1 | 2 | 3;
  fact: string;
}

export const QUESTIONS: Question[] = [
  {clue: "MS Dhoni finished off the 2011 World Cup final with a six over long-on. Where was he batting?", answer: "Wankhede Stadium, Mumbai", lat: 18.9389, lon: 72.8258, sport: "Cricket", difficulty: 1, fact: "Dhoni's 91* off 79 balls beat Sri Lanka on 2 April 2011, India's first World Cup win since 1983."},
  {clue: "Anil Kumble took all 10 wickets in a Test innings against Pakistan in February 1999. Where?", answer: "Feroz Shah Kotla (Arun Jaitley Stadium), Delhi", lat: 28.6379, lon: 77.2432, sport: "Cricket", difficulty: 1, fact: "Kumble finished with 10 for 74, only the second bowler ever to take all ten in a Test innings after Jim Laker."},
  {clue: "Following on against Australia in 2001, India were saved by VVS Laxman's 281 and won the Test. Where?", answer: "Eden Gardens, Kolkata", lat: 22.5646, lon: 88.3433, sport: "Cricket", difficulty: 1, fact: "Laxman and Rahul Dravid batted through the whole fourth day, and Harbhajan Singh's hat-trick helped finish it."},
  {clue: "Sachin Tendulkar scored the first double century in men's ODI history, against South Africa in 2010. Where?", answer: "Captain Roop Singh Stadium, Gwalior", lat: 26.2183, lon: 78.1828, sport: "Cricket", difficulty: 2, fact: "Sachin's 200* came off 147 balls on 24 February 2010."},
  {clue: "The world's largest cricket stadium, which hosted the 2023 World Cup final, is in which city?", answer: "Narendra Modi Stadium, Ahmedabad", lat: 23.0917, lon: 72.5975, sport: "Cricket", difficulty: 1, fact: "The rebuilt Motera ground seats about 132,000 people."},
  {clue: "India's first ever Test win came against England in 1952. Where was it played?", answer: "M. A. Chidambaram Stadium (Chepauk), Chennai", lat: 13.0628, lon: 80.2793, sport: "Cricket", difficulty: 2, fact: "Vinoo Mankad took 12 wickets as India won by an innings and 8 runs, 20 years after their first Test."},
  {clue: "Brendon McCullum's 158* lit up the very first IPL match in April 2008. Where?", answer: "M. Chinnaswamy Stadium, Bengaluru", lat: 12.9788, lon: 77.5996, sport: "Cricket", difficulty: 1, fact: "Kolkata Knight Riders beat Royal Challengers Bangalore by 140 runs on IPL's opening night."},
  {clue: "India beat Pakistan in the 2011 World Cup semi-final, watched by both Prime Ministers. Where?", answer: "PCA Stadium, Mohali", lat: 30.6908, lon: 76.7376, sport: "Cricket", difficulty: 2, fact: "Sachin Tendulkar top-scored with 85 and India won by 29 runs."},
  {clue: "In just his fifth ODI, MS Dhoni announced himself with 148 against Pakistan in April 2005. Where?", answer: "ACA-VDCA Stadium, Visakhapatnam", lat: 17.7972, lon: 83.3524, sport: "Cricket", difficulty: 2, fact: "It was Dhoni's first international hundred, made batting at number three."},
  {clue: "MS Dhoni smashed 183* to chase down 299 against Sri Lanka in October 2005. Where?", answer: "Sawai Mansingh Stadium, Jaipur", lat: 26.8943, lon: 75.803, sport: "Cricket", difficulty: 2, fact: "Dhoni hit 10 sixes and India won with 23 balls to spare."},
  {clue: "Virender Sehwag hit 219 against West Indies in December 2011, then a world-record ODI score. Where?", answer: "Holkar Stadium, Indore", lat: 22.7243, lon: 75.8797, sport: "Cricket", difficulty: 2, fact: "Sehwag's 219 came off 149 balls and stood as the ODI record until Rohit Sharma's 264 in 2014."},
  {clue: "Which Test ground sits at 1,457 metres with the snowy Dhauladhar range behind it?", answer: "HPCA Stadium, Dharamsala", lat: 32.1976, lon: 76.3259, sport: "Cricket", difficulty: 2, fact: "India played their first Test here against Australia in 2017."},
  {clue: "The world's highest cricket ground was built by the Maharaja of Patiala in 1893. Where is it?", answer: "Chail Cricket Ground, Himachal Pradesh", lat: 30.9617, lon: 77.1985, sport: "Cricket", difficulty: 3, fact: "The ground sits at about 2,444 metres and is now part of Chail Military School."},
  {clue: "The Ranji Trophy honours K. S. Ranjitsinhji, Jam Sahib of a princely state. Find its capital.", answer: "Jamnagar (Nawanagar), Gujarat", lat: 22.4707, lon: 70.0577, sport: "Cricket", difficulty: 3, fact: "Ranji played for England in the 1890s; the national championship was named after him in 1934."},
  {clue: "MS Dhoni's hometown got its own international stadium in 2013. Where is it?", answer: "JSCA International Stadium, Ranchi", lat: 23.31, lon: 85.275, sport: "Cricket", difficulty: 2, fact: "Its first ODI was India vs England in January 2013, and India won."},
  {clue: "Sachin Tendulkar learned his cricket under coach Ramakant Achrekar on this famous maidan.", answer: "Shivaji Park, Mumbai", lat: 19.0269, lon: 72.8384, sport: "Cricket", difficulty: 1, fact: "Shivaji Park has also produced Sunil Gavaskar, Vinod Kambli and Ajit Wadekar."},
  {clue: "The 'home' of Rajasthan Royals moved to the Northeast for some IPL games from 2023. Which city?", answer: "Barsapara Cricket Stadium, Guwahati", lat: 26.1449, lon: 91.738, sport: "Cricket", difficulty: 2, fact: "Guwahati became the first Northeast city to host IPL matches."},
  {clue: "West Indies played India in an ODI in October 1983 at the only men's international venue in Kashmir. Where?", answer: "Sher-i-Kashmir Stadium, Srinagar", lat: 34.071, lon: 74.8165, sport: "Cricket", difficulty: 3, fact: "Srinagar hosted two men's ODIs, in 1983 and 1986."},
  {clue: "Odisha's capital hosted the Men's Hockey World Cup in both 2018 and 2023. Where?", answer: "Kalinga Stadium, Bhubaneswar", lat: 20.2879, lon: 85.8248, sport: "Hockey", difficulty: 1, fact: "Odisha has sponsored the Indian hockey teams since 2018."},
  {clue: "India's biggest hockey stadium was built in record time for the 2023 World Cup. Where?", answer: "Birsa Munda Hockey Stadium, Rourkela", lat: 22.2533, lon: 84.8833, sport: "Hockey", difficulty: 3, fact: "It seats around 21,000 and is named after the tribal freedom fighter Birsa Munda."},
  {clue: "Major Dhyan Chand, the 'Wizard' of hockey, was born here in 1905.", answer: "Prayagraj (Allahabad), Uttar Pradesh", lat: 25.4358, lon: 81.8463, sport: "Hockey", difficulty: 2, fact: "Dhyan Chand won three Olympic golds, and his birthday, 29 August, is National Sports Day."},
  {clue: "This small Punjab village near Jalandhar has produced more than a dozen hockey Olympians.", answer: "Sansarpur, Punjab", lat: 31.315, lon: 75.624, sport: "Hockey", difficulty: 3, fact: "Sansarpur players have represented India, Kenya and Canada at the Olympics."},
  {clue: "Mohun Bagan's barefoot players beat the East Yorkshire Regiment in the 1911 IFA Shield final. Where?", answer: "Calcutta FC ground, Kolkata Maidan", lat: 22.558, lon: 88.343, sport: "Football", difficulty: 2, fact: "The 2–1 win made Mohun Bagan the first Indian club to win the IFA Shield."},
  {clue: "The Durand Cup, Asia's oldest football tournament, began in 1888 in the hills near which city?", answer: "Shimla (first edition at Dagshai)", lat: 31.1048, lon: 77.1734, sport: "Football", difficulty: 3, fact: "It was started by Sir Mortimer Durand, then Foreign Secretary in British India."},
  {clue: "The 2017 FIFA U-17 World Cup final, England 5–2 Spain, was played where?", answer: "Salt Lake Stadium (VYBK), Kolkata", lat: 22.5687, lon: 88.4091, sport: "Football", difficulty: 2, fact: "Over 66,000 fans watched the final, and the tournament set an U-17 attendance record."},
  {clue: "Kerala Blasters pack their famous 'Manjappada' crowds into which stadium?", answer: "Jawaharlal Nehru Stadium, Kochi", lat: 9.9971, lon: 76.3006, sport: "Football", difficulty: 2, fact: "In ISL's early seasons Kochi regularly drew crowds above 50,000."},
  {clue: "FC Goa play home games at this stadium in Margao.", answer: "Fatorda Stadium, Margao", lat: 15.2887, lon: 73.9625, sport: "Football", difficulty: 2, fact: "Goa has one of India's oldest club football cultures, with Salgaocar, Dempo and Churchill Brothers."},
  {clue: "The Tata Football Academy, launched in 1987, became a pioneer of Indian youth football. Where?", answer: "Jamshedpur, Jharkhand", lat: 22.8046, lon: 86.2029, sport: "Football", difficulty: 2, fact: "Jamshedpur FC now plays in the ISL at the nearby JRD Tata Sports Complex."},
  {clue: "Aizawl FC became the first Northeast club to win the I-League, in 2016–17. Where are they based?", answer: "Aizawl, Mizoram", lat: 23.7271, lon: 92.7176, sport: "Football", difficulty: 3, fact: "Mizoram is one of India's football heartlands, and Aizawl beat the big Kolkata clubs to the title."},
  {clue: "A stadium in South Sikkim is named after Bhaichung Bhutia, while he was still playing. Which town?", answer: "Namchi, Sikkim", lat: 27.1667, lon: 88.3639, sport: "Football", difficulty: 3, fact: "Bhaichung Bhutia captained India and became the first Indian to play professionally in England."},
  {clue: "Pro Kabaddi League's first match, U Mumba vs Jaipur Pink Panthers, was held in July 2014. Which city?", answer: "NSCI Dome, Mumbai", lat: 18.9796, lon: 72.8178, sport: "Kabaddi", difficulty: 2, fact: "Jaipur Pink Panthers went on to win that first season."},
  {clue: "British officers learned modern polo from players in this northeastern city in the 1850s.", answer: "Mapal Kangjeibung, Imphal", lat: 24.8074, lon: 93.9384, sport: "Polo", difficulty: 2, fact: "Mapal Kangjeibung is considered the world's oldest polo ground still in use."},
  {clue: "Vijender Singh's 2008 Olympic boxing bronze put this Haryana town, called 'mini Cuba', on the map.", answer: "Bhiwani, Haryana", lat: 28.7975, lon: 76.1322, sport: "Boxing", difficulty: 2, fact: "The Bhiwani Boxing Club has produced several Olympic and Commonwealth medallists."},
  {clue: "Neeraj Chopra, India's first Olympic gold medallist in athletics, grew up in Khandra village near which city?", answer: "Panipat, Haryana", lat: 29.3909, lon: 76.9635, sport: "Athletics", difficulty: 2, fact: "His 87.58 m throw won gold at Tokyo 2020 on 7 August 2021."},
  {clue: "PT Usha, the 'Payyoli Express', is named after her home town. Where is it?", answer: "Payyoli, Kerala", lat: 11.5197, lon: 75.6203, sport: "Athletics", difficulty: 2, fact: "Usha missed a 400 m hurdles bronze by 1/100th of a second at the 1984 Olympics."},
  {clue: "The first Asian Games opened in March 1951 at this stadium.", answer: "National Stadium, New Delhi", lat: 28.6129, lon: 77.2373, sport: "Multi-sport", difficulty: 1, fact: "Now the Major Dhyan Chand National Stadium, it sits at the end of Kartavya Path near India Gate."},
  {clue: "India hosted Formula 1's Indian Grand Prix from 2011 to 2013. Where was the track?", answer: "Buddh International Circuit, Greater Noida", lat: 28.3487, lon: 77.5331, sport: "Motorsport", difficulty: 2, fact: "Sebastian Vettel won all three Indian Grands Prix."},
  {clue: "The 44th Chess Olympiad in 2022 was hosted in a seaside temple town. Which one?", answer: "Mamallapuram, Tamil Nadu", lat: 12.6208, lon: 80.1945, sport: "Chess", difficulty: 2, fact: "India hosted the Olympiad for the first time and won two bronze medals."},
  {clue: "Viswanathan Anand, India's first grandmaster, was born in which Tamil Nadu town?", answer: "Mayiladuthurai, Tamil Nadu", lat: 11.1035, lon: 79.655, sport: "Chess", difficulty: 3, fact: "Anand was born in December 1969 and grew up in Chennai."},
  {clue: "PV Sindhu and Saina Nehwal trained at Pullela Gopichand's academy in which city?", answer: "Gopichand Academy, Gachibowli, Hyderabad", lat: 17.4401, lon: 78.3489, sport: "Badminton", difficulty: 1, fact: "Gopichand, the 2001 All England champion, opened the academy in 2008."},
  {clue: "British officers first wrote down badminton's rules in this city, giving the early game its name.", answer: "Pune (Poona), Maharashtra", lat: 18.5204, lon: 73.8567, sport: "Badminton", difficulty: 3, fact: "The rules were drafted in the 1870s, and the game was called 'Poona' before Badminton House gave it a new name."},
  {clue: "Lakshya Sen, 2021 World Championships bronze medallist, was born in this Uttarakhand hill town.", answer: "Almora, Uttarakhand", lat: 29.5971, lon: 79.6591, sport: "Badminton", difficulty: 3, fact: "Lakshya's grandfather is credited with introducing badminton to Almora."},
  {clue: "Huge snake boats race in the Nehru Trophy Boat Race every August. Where?", answer: "Punnamada Lake, Alappuzha", lat: 9.5096, lon: 76.3399, sport: "Traditional", difficulty: 2, fact: "The race began after Jawaharlal Nehru watched one in 1952 and donated the trophy."},
  {clue: "Jallikattu's best-known arena, held each Pongal, is in this village near Madurai.", answer: "Alanganallur, Tamil Nadu", lat: 10.0469, lon: 78.0906, sport: "Traditional", difficulty: 2, fact: "Tamil Nadu passed a law in 2017 to keep Jallikattu legal."},
  {clue: "Kambala jockey Srinivas Gowda went viral for racing buffaloes in this coastal region. Find Moodbidri.", answer: "Moodbidri, Dakshina Kannada", lat: 13.0687, lon: 74.9946, sport: "Traditional", difficulty: 3, fact: "His 2020 run of 100 m in about 9.55 seconds led to 'Usain Bolt' comparisons."},
  {clue: "The skiing events of the Khelo India Winter Games are held on these Kashmir slopes.", answer: "Gulmarg, Jammu and Kashmir", lat: 34.0484, lon: 74.3805, sport: "Winter", difficulty: 2, fact: "Gulmarg's gondola reaches nearly 4,000 m on Mount Apharwat."},
  {clue: "Ice hockey at the Khelo India Winter Games is played on natural rinks in this Ladakh town.", answer: "Leh, Ladakh", lat: 34.1526, lon: 77.5771, sport: "Winter", difficulty: 3, fact: "Ladakh's ice hockey teams play outdoors at about 3,500 m."},
  {clue: "Asia's largest sports institute, the National Institute of Sports, is housed in a former palace. Where?", answer: "NIS, Motibagh Palace, Patiala", lat: 30.3366, lon: 76.417, sport: "Multi-sport", difficulty: 3, fact: "The National Institute of Sports was founded in 1961 and trains many of India's national coaches."},
];

export const PRACTICE_GROUPS: Record<string, (q: Question) => boolean> = {
  mixed: () => true,
  cricket: (q) => q.sport === "Cricket",
  "football-hockey": (q) => q.sport === "Football" || q.sport === "Hockey",
  other: (q) => !["Cricket", "Football", "Hockey"].includes(q.sport),
};

/** Picks 5 question indexes, easy to hard, with at most 2 from one sport when possible. */
export function pickRound(rand: () => number, pool: number[]): number[] {
  const want: number[][] = [[1], [1, 2], [2], [2, 3], [3]];
  const used = new Set<number>();
  const perSport: Record<string, number> = {};
  const out: number[] = [];
  for (const levels of want) {
    let cands = pool.filter((i) => !used.has(i) && levels.includes(QUESTIONS[i].difficulty));
    const fresh = cands.filter((i) => (perSport[QUESTIONS[i].sport] ?? 0) < 2);
    if (fresh.length) cands = fresh;
    if (!cands.length) cands = pool.filter((i) => !used.has(i));
    if (!cands.length) break;
    const pick = cands[Math.floor(rand() * cands.length)];
    used.add(pick);
    out.push(pick);
    perSport[QUESTIONS[pick].sport] = (perSport[QUESTIONS[pick].sport] ?? 0) + 1;
  }
  return out;
}

const ALL = QUESTIONS.map((_, i) => i);

export function dailyQuestionIds(dayNum: number): number[] {
  return pickRound(rng(dayNum * 7919 + 13), ALL);
}

export function practiceQuestionIds(group: string, seed: number): number[] | null {
  const filter = PRACTICE_GROUPS[group];
  if (!filter) return null;
  return pickRound(rng(seed), ALL.filter((i) => filter(QUESTIONS[i])));
}

export function isValidRound(ids: unknown): ids is number[] {
  return (
    Array.isArray(ids) &&
    ids.length === 5 &&
    new Set(ids).size === 5 &&
    ids.every((i) => Number.isInteger(i) && i >= 0 && i < QUESTIONS.length)
  );
}
