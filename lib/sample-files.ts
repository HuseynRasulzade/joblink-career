// Sample CSV files for the admin catalog imports (job titles, education, skills). The first row names the
// columns; the importers skip it. Every row is read back by the real parser in the tests.
const bom = "﻿";
export const JOB_TITLES_SAMPLE = `${bom}Ad;Name;Qrup;sinonim1|sinonim2
Kredit mütəxəssisi;Credit specialist;finance;kredit eksperti|credit officer
İşə qəbul üzrə mütəxəssis;Recruitment specialist;İnsan resursları;rekruter|recruiter
Quru yük daşıma əməliyyatçısı;Road freight dispatcher;transport;dispetçer
`;
export const EDUCATION_SAMPLE = `${bom}Növ;Ad;Name;Название;Ölkə/Sahə;sinonim1|sinonim2
universitet;Qafqaz Universiteti;Qafqaz University;Кавказский университет;Azərbaycan;QU|Caucasus University
ixtisas;Maliyyə və bank işi;Finance and banking;Финансы и банковское дело;İqtisadiyyat, biznes və idarəetmə;bank işi
`;
export const SKILLS_SAMPLE = `${bom}Ad (az);Name (en);Kateqoriya;Category;sinonim1|sinonim2
Büdcə planlaşdırması;Budget planning;Maliyyə;Finance;büdcələşdirmə|budgeting
Əmək haqqı hesablanması;Payroll processing;Kadr;HR;payroll|maaş hesablanması
`;
export function downloadCsv(content: string, file: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
