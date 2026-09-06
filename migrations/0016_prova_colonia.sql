-- Una colonia felina non ha un sito: e' una persona che se ne prende cura,
-- censita dal Comune o dalla ASL. La prova, per lei, e' una riga di testo
-- (dove e' censita, numero o data se li ha), non un link.
ALTER TABLE users ADD COLUMN proof_note TEXT;
