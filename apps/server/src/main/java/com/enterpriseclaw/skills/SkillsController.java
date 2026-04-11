package com.enterpriseclaw.skills;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/skills")
@RequiredArgsConstructor
public class SkillsController {

    private final SkillLoader skillLoader;

    public record SkillSummary(String name, String description, int toolCount, String provider) {}

    public record SkillDetail(String name, String description, String markdownBody,
                              List<LoadedSkill.ToolDefinition> tools, String provider) {}

    public record CreateSkillRequest(String name, String content) {}

    public record UpdateSkillRequest(String content) {}

    @GetMapping
    public List<SkillSummary> listSkills() {
        return skillLoader.getLoadedSkills().stream()
                .map(s -> new SkillSummary(s.name(), s.description(), s.tools().size(), s.name()))
                .toList();
    }

    @GetMapping("/{name}")
    public SkillDetail getSkill(@PathVariable String name) {
        return skillLoader.getSkill(name)
                .map(s -> new SkillDetail(s.name(), s.description(), s.markdownBody(), s.tools(), s.name()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found: " + name));
    }

    @PostMapping("/rescan")
    public Map<String, Integer> rescan() {
        skillLoader.rescan();
        return Map.of("count", skillLoader.getLoadedSkills().size());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SkillDetail createSkill(@RequestBody CreateSkillRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }
        if (skillLoader.getSkill(request.name()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Skill already exists: " + request.name());
        }
        skillLoader.writeSkill(request.name(), request.content());
        return skillLoader.getSkill(request.name())
                .map(s -> new SkillDetail(s.name(), s.description(), s.markdownBody(), s.tools(), s.name()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to load created skill"));
    }

    @PutMapping("/{name}")
    public SkillDetail updateSkill(@PathVariable String name, @RequestBody UpdateSkillRequest request) {
        if (skillLoader.getSkill(name).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found: " + name);
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }
        skillLoader.writeSkill(name, request.content());
        return skillLoader.getSkill(name)
                .map(s -> new SkillDetail(s.name(), s.description(), s.markdownBody(), s.tools(), s.name()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to reload skill"));
    }

    @DeleteMapping("/{name}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSkill(@PathVariable String name) {
        if (skillLoader.getSkill(name).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found: " + name);
        }
        skillLoader.deleteSkill(name);
    }
}
