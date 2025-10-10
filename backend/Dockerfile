FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

# 1) Instalar LibreOffice y fuentes
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates wget locales fontconfig \
        libreoffice \
        fonts-liberation fonts-liberation2; \
    rm -rf /var/lib/apt/lists/*

# 2) Generar locale
RUN sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen

# 3) Alias de fuentes comunes
RUN mkdir -p /etc/fonts/conf.d && \
    printf '%s\n' '<?xml version="1.0"?>' \
      '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">' \
      '<fontconfig>' \
      '  <alias>' \
      '    <family>Arial</family>' \
      '    <prefer><family>Liberation Sans</family></prefer>' \
      '  </alias>' \
      '  <alias>' \
      '    <family>Times New Roman</family>' \
      '    <prefer><family>Liberation Serif</family></prefer>' \
      '  </alias>' \
      '  <alias>' \
      '    <family>Courier New</family>' \
      '    <prefer><family>Liberation Mono</family></prefer>' \
      '  </alias>' \
      '</fontconfig>' > /etc/fonts/conf.d/60-alias-liberation-ms.xml && \
    fc-cache -f

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo el código fuente de la app
COPY . .

EXPOSE 8000
# 👇 Aquí el cambio importante
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]