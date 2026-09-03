const DOWNLOAD_LINKS = {
  lotn: 'https://modrinth.com/plugin/lotn/versions',
  valentines: 'https://modrinth.com/plugin/valentines/versions',
};

const PLUGINS = Object.entries(DOWNLOAD_LINKS).map(([slug, downloadUrl]) => ({
  slug,
  downloadUrl,
}));

function formatDate(iso) {
  if (!iso) return '-';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(number) {
  if (number == null) return '-';
  return Number(number).toLocaleString('en-US');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function loadPlugin(plugin) {
  const card = document.querySelector(
    `.plugin-card[data-slug="${plugin.slug}"]`
  );

  if (!card) return;

  const nameEl = card.querySelector('.plugin-name');
  const summaryEl = card.querySelector('.plugin-summary');
  const downloadsEl = card.querySelector('.stat-downloads');
  const versionEl = card.querySelector('.stat-version');
  const updatedEl = card.querySelector('.stat-updated');
  const downloadButton = card.querySelector('.plugin-download');

  if (downloadButton) {
    downloadButton.href = plugin.downloadUrl;
    downloadButton.removeAttribute('download');
  }

  try {
    const project = await fetchJson(
      `https://api.modrinth.com/v2/project/${plugin.slug}`
    );

    if (nameEl) {
      nameEl.textContent = project.title || plugin.slug;
    }

    if (summaryEl) {
      summaryEl.textContent =
        project.description || 'No description provided.';
    }

    if (downloadsEl) {
      downloadsEl.textContent = formatNumber(project.downloads);
    }

    if (versionEl) {
      versionEl.textContent = '-';
    }

    if (updatedEl) {
      updatedEl.textContent = formatDate(project.updated);
    }

    try {
      const versions = await fetchJson(
        `https://api.modrinth.com/v2/project/${plugin.slug}/version`
      );

      if (Array.isArray(versions) && versions.length > 0) {
        const listedVersions = versions.filter(
          (version) => version.status === 'listed'
        );

        const usableVersions =
          listedVersions.length > 0 ? listedVersions : versions;

        const latestVersion = [...usableVersions].sort((a, b) => {
          return (
            new Date(b.date_published).getTime() -
            new Date(a.date_published).getTime()
          );
        })[0];

        if (versionEl) {
          versionEl.textContent =
            latestVersion.version_number ||
            latestVersion.name ||
            '-';
        }

        if (updatedEl) {
          updatedEl.textContent = formatDate(
            latestVersion.date_published || project.updated
          );
        }

      }
    } catch (error) {
      console.error(
        `Failed to load versions for ${plugin.slug}:`,
        error
      );
    }
  } catch (error) {
    if (summaryEl) {
      summaryEl.textContent =
        'Could not load plugin data from Modrinth right now.';
    }

    console.error(`Failed to load ${plugin.slug}:`, error);
  } finally {
    card.removeAttribute('aria-busy');
  }
}

const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

Promise.all(PLUGINS.map(loadPlugin)).catch((error) => {
  console.error('Plugin load error:', error);
});