export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#f7f5f0] text-[#1a1a1a]">
      <main className="w-full max-w-lg text-center space-y-8">
        <div
          className="mx-auto h-1 w-16 rounded-full bg-[#1e3a5f]"
          aria-hidden
        />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1e3a5f]">
          Mairie de Succieu
        </h1>
        <p className="text-lg leading-relaxed text-[#3d3d3d]">
          Le site de la commune est momentanément indisponible : nous préparons
          une nouvelle version pour mieux vous informer.
        </p>
        <p className="text-base text-[#5c5c5c]">
          Merci de votre compréhension. Nous vous invitons à repasser
          prochainement.
        </p>
        <p className="text-sm text-[#7a7a7a] pt-4 border-t border-[#d9d4cc]">
          Pour toute urgence, rapprochez-vous des services de la mairie aux
          horaires d&apos;ouverture habituels.
        </p>
      </main>
    </div>
  );
}
