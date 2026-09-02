-- Prima un annuncio si poteva chiudere solo bene. Chi aveva smesso di sperare
-- aveva due scelte: lasciarlo aperto per sempre, o cancellarlo - e allora chi
-- teneva gli occhi aperti continuava a cercare un animale che non c'e' piu.
ALTER TABLE `posts` ADD `outcome` text;
