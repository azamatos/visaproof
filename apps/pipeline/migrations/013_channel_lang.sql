-- One post a day per channel language (@visaproof in English, @visaproof_ru in Russian): each channel lists every
-- role once.
alter table channel_post add column lang text not null default 'en';
