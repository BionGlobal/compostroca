import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldCheck, Users } from 'lucide-react';

interface Voluntario {
  iniciais: string;
  numero_balde: number;
  peso: number;
}

interface VolunteerDetailsProps {
  voluntarios: Voluntario[];
  validadores: string[];
}

export const VolunteerDetails = ({ voluntarios, validadores }: VolunteerDetailsProps) => {
  const pesoTotal = voluntarios.reduce((acc, v) => acc + v.peso, 0);
  const cepilho = pesoTotal * 0.35;
  const total = pesoTotal + cepilho;

  return (
    <Accordion type="multiple" className="space-y-3">
      {/* Accordion 1: Participantes */}
      <AccordionItem value="participantes" className="glass-light border rounded-xl px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span>Participantes ({voluntarios.length})</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Voluntário</TableHead>
                  <TableHead className="text-xs sm:text-sm text-center">Balde</TableHead>
                  <TableHead className="text-xs sm:text-sm text-right">Peso (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voluntarios.length > 0 ? (
                  voluntarios.map((voluntario, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {voluntario.iniciais}
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm">
                        #{voluntario.numero_balde}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {voluntario.peso.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground text-xs sm:text-sm py-6">
                      Nenhum participante registrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {voluntarios.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold text-xs sm:text-sm">
                      Resíduo entregue
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs sm:text-sm">
                      {pesoTotal.toFixed(2)} kg
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold text-xs sm:text-sm">
                      Cepilho (35%)
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs sm:text-sm">
                      {cepilho.toFixed(2)} kg
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold text-xs sm:text-sm">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs sm:text-sm">
                      {total.toFixed(2)} kg
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Accordion 2: Validadores */}
      <AccordionItem value="validadores" className="glass-light border rounded-xl px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
            <span>Validadores ({validadores.length})</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-4">
            {validadores.length > 0 ? (
              <ul className="space-y-2">
                {validadores.map((validador, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm sm:text-base text-foreground p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{validador}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground text-xs sm:text-sm py-4">
                Nenhum validador registrado
              </p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
