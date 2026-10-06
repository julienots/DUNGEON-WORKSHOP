/**
 * LORE (V2) — l'histoire se découvre par petits fragments, sans cinématique.
 * Chaque page se débloque quand sa condition `unlock` est remplie (vérifiée par LoreSystem) :
 *  { floor: n }        étage maximum atteint
 *  { boss: id }        boss vaincu
 *  { biome: id }       biome découvert
 *  { ascensions: n }   nombre d'Ascensions
 *  { mode: id }        mode de jeu joué au moins une fois
 *  { monsters: n }     espèces découvertes
 *  { mutation: true }  première mutation
 *  { master: n }       niveau du Maître
 */
export const LORE_CHAPTERS = {
  origins: { name: 'L’origine des donjons', icon: '🕳️' },
  masters: { name: 'Les anciens Maîtres', icon: '👁️' },
  civilisations: { name: 'Les civilisations disparues', icon: '🏛️' },
  ancients: { name: 'Les monstres anciens', icon: '🐉' },
  dimensions: { name: 'Les dimensions', icon: '🌀' },
  magic: { name: 'L’origine de la magie', icon: '✨' },
};

export const LORE = [
  { id: 'l_first_stone', chapter: 'origins', title: 'La première pierre', unlock: { floor: 1 }, text: 'Avant les royaumes, avant les héros, il y avait la Faille. Les premiers donjons ne furent pas creusés : ils poussèrent, comme des racines, autour des blessures du monde.' },
  { id: 'l_hunger', chapter: 'origins', title: 'La faim du donjon', unlock: { floor: 3 }, text: 'Un donjon se nourrit d’ambition. Chaque aventurier qui franchit l’entrée apporte avec lui un rêve de trésor — et c’est ce rêve, bien plus que l’or, qui fait grandir les salles.' },
  { id: 'l_heart', chapter: 'origins', title: 'Le cœur de pierre', unlock: { boss: 'colossal_golem' }, text: 'Le Golem colossal n’était pas un gardien. C’était le premier cœur du donjon, sculpté pour battre au rythme des tunnels. En le brisant, vous avez pris sa place.' },
  { id: 'l_masters_1', chapter: 'masters', title: 'Le registre des Maîtres', unlock: { master: 5 }, text: 'Dans la salle la plus profonde, un registre de fer liste quarante-deux noms. Le dernier a été gratté. Le vôtre est déjà gravé en dessous, d’une écriture que vous ne reconnaissez pas.' },
  { id: 'l_masters_2', chapter: 'masters', title: 'Le Maître qui partit', unlock: { ascensions: 1 }, text: 'L’Ascension n’est pas une fin. Les anciens Maîtres le savaient : en abandonnant leur donjon, ils emportaient son essence, et recommençaient plus forts, ailleurs, encore.' },
  { id: 'l_masters_3', chapter: 'masters', title: 'L’Archimage déchu', unlock: { boss: 'archmage' }, text: 'L’Archimage fut le dix-septième Maître. Il voulut comprendre la Faille plutôt que la servir. Elle le garda, à mi-chemin entre deux mondes, comme gardien de ses propres livres.' },
  { id: 'l_civ_1', chapter: 'civilisations', title: 'Le peuple des marais', unlock: { biome: 'swamp' }, text: 'Sous la vase du Marais toxique dorment des cités entières. Leurs habitants avaient appris à respirer le poison. Il ne reste d’eux que des spores qui se souviennent.' },
  { id: 'l_civ_2', chapter: 'civilisations', title: 'Les bâtisseurs de sable', unlock: { biome: 'desert' }, text: 'Le Désert était une mer intérieure. Ses bâtisseurs creusèrent si profond pour trouver de l’eau qu’ils percèrent la voûte d’un donjon endormi.' },
  { id: 'l_civ_3', chapter: 'civilisations', title: 'La Nécropole', unlock: { biome: 'necropolis' }, text: 'Le Roi des morts régnait sur un empire qui refusa de mourir. Quand la peste vint, il ordonna que personne ne quitte la ville. Personne ne la quitta jamais.' },
  { id: 'l_civ_4', chapter: 'civilisations', title: 'Le dernier décret', unlock: { boss: 'king_of_the_dead' }, text: 'Sa couronne portait une inscription : « Tant qu’un sujet se souviendra de moi, je régnerai. » Vos monstres, eux, se souviennent de tout.' },
  { id: 'l_anc_1', chapter: 'ancients', title: 'Le sommeil du dragon', unlock: { boss: 'ancient_dragon' }, text: 'Les dragons ne naquirent pas du feu : ce sont les premiers aventuriers, ceux qui restèrent si longtemps sur leur trésor qu’ils en devinrent les gardiens.' },
  { id: 'l_anc_2', chapter: 'ancients', title: 'La Reine de sang', unlock: { boss: 'vampire_queen' }, text: 'La Reine vampire fut la seule à passer un pacte avec la Faille et à le respecter. Elle paie toujours. Chaque nuit, en sang.' },
  { id: 'l_anc_3', chapter: 'ancients', title: 'Le bestiaire vivant', unlock: { monsters: 40 }, text: 'Aucun monstre n’est vraiment créé. Les portails ne font qu’éveiller ce qui dormait dans la roche : des formes anciennes, patientes, qui attendaient un Maître.' },
  { id: 'l_anc_4', chapter: 'ancients', title: 'Mutations', unlock: { mutation: true }, text: 'La Faille réécrit ce qu’elle touche. Les mutations ne sont pas des maladies : ce sont des souvenirs d’autres mondes qui s’impriment dans la chair.' },
  { id: 'l_dim_1', chapter: 'dimensions', title: 'L’autre côté', unlock: { biome: 'astral' }, text: 'Dans la Dimension astrale, les étoiles sont des donjons vus de très loin. Chacune abrite un Maître. Certaines se sont éteintes.' },
  { id: 'l_dim_2', chapter: 'dimensions', title: 'La corruption', unlock: { biome: 'corrupted' }, text: 'La Dimension corrompue est ce qui reste quand un donjon meurt sans Maître : des règles qui changent à chaque instant, et une faim qui ne trouve plus de bouche.' },
  { id: 'l_dim_3', chapter: 'dimensions', title: 'Le donjon sans fond', unlock: { mode: 'infinite' }, text: 'On dit que le donjon Infini n’a pas de dernier étage. On se trompe : il en a un. Il est simplement en train d’être creusé.' },
  { id: 'l_dim_4', chapter: 'dimensions', title: 'L’Entité', unlock: { boss: 'abyssal_entity' }, text: 'L’Entité abyssale n’attaque pas votre donjon. Elle l’observe, comme on observe un reflet. Peut-être est-ce elle, la Faille.' },
  { id: 'l_mag_1', chapter: 'magic', title: 'L’essence', unlock: { floor: 2 }, text: 'L’essence est la sueur du donjon. Chaque combat, chaque victoire, chaque défaite en fait perler un peu sur les murs.' },
  { id: 'l_mag_2', chapter: 'magic', title: 'Les éléments', unlock: { floor: 6 }, text: 'Le feu, la glace, la foudre : la magie n’est que la Faille qui hésite entre plusieurs mondes. Quand deux éléments se rencontrent, elle choisit — et le choc est terrible.' },
  { id: 'l_mag_3', chapter: 'magic', title: 'L’essence légendaire', unlock: { mode: 'roguelite' }, text: 'Les Âmes perdues dans les runs ne disparaissent pas. Elles se condensent en essence légendaire, que seuls les Maîtres savent récolter.' },
  { id: 'l_mag_4', chapter: 'magic', title: 'Le Maître dimensionnel', unlock: { ascensions: 5 }, text: 'Au-delà de l’Ascension, au-delà de la Renaissance, une légende parle d’un Maître qui posséda tous les donjons à la fois. Le registre de fer s’arrête avant son nom.' },
];

export const LORE_MAP = Object.fromEntries(LORE.map((l) => [l.id, l]));
